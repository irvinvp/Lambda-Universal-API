const fs = require("fs");
const vm = require("vm");
const https = require("https");
const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB.DocumentClient();
const zlib = require("zlib");
const worker1 = require("worker1");
const table_name = ""; // Nombre de la tabla DynamoDB
const app = "_";
let token_ram = {};
let ip_baned = {};
let lambda_id = Math.random().toString(36).substring(2);
// Libs
let lib1 = fs.readFileSync("moment.min.js", "utf-8");
vm.runInThisContext(lib1, "moment.min.js");

// Handler [No edit]
exports.handler = async (event) => {
  if (event.headers["accept-encoding"].includes("gzip")) {
    let r = await main(event);
    let status = r.status;
    r.lambda_id = lambda_id;
    if (status == 400) _ip(event.requestContext.http.sourceIp);
    if (ip_baned[event.requestContext.http.sourceIp] > 50)
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "IP baned" }),
        headers: {},
      };
    r = zlib.gzipSync(JSON.stringify(r, null, 2));
    return {
      body: r.toString("base64"),
      isBase64Encoded: true,
      statusCode: status,
      headers: {
        "content-encoding": "gzip",
      },
    };
  }
};
// Main [No edit]
async function main(event) {
  let x = {
    method: event.requestContext.http.method,
    path: event.requestContext.http.path,
    ip: event.requestContext.http.sourceIp,
    query:
      event.queryStringParameters === undefined
        ? {}
        : event.queryStringParameters,
    body: event.body === undefined ? "{}" : event.body,
  };
  if (x.method === "POST") return await post(x);
  if (x.method === "GET") return await get(x);
  return { status: 404, error: "Method not allowed", ip: x.ip };
}
// Get
async function get(event) {
  let level = { level: -1 };
  let part;
  switch (event.path) {
    case "/api/v1/read":
      if (event.query.id === undefined)
        return { status: 404, error: "id is required" };
      if (event.query.token === undefined)
        return { status: 404, error: "token is required" };
      level = await _level(event.query.token, event.ip);
      if (level.level < 0 || (event.query.id[0] == "_" && level.level != 99))
        return { status: 405, error: "access denied" };
      // Filters
      if (Object.keys(level.filters).length == 0) {
        return await _read(event.query.id);
      } else {
        part = await _read(event.query.id);
        if (part.Item == undefined) return part;
        if (Array.isArray(part.Item.data)) {
          let data = [];
          for (let x in part.Item.data) {
            for (let y in level.filters) {
              if (part.Item.data[x][y] != undefined) {
                if (Array.isArray(part.Item.data[x][y])) {
                  if (
                    level.filters[y].some((w) =>
                      part.Item.data[x][y].includes(w)
                    )
                  ) {
                    data.push(part.Item.data[x]);
                  }
                } else {
                  if (level.filters[y].includes(part.Item.data[x][y])) {
                    data.push(part.Item.data[x]);
                  }
                }
              } else {
                data.push(part.Item.data[x]);
              }
            }
          }
          part.Item.data = data;
        } else {
          for (let x in part.Item.data) {
            for (let y in level.filters) {
              if (part.Item.data[x][y] != undefined) {
                if (Array.isArray(part.Item.data[x][y])) {
                  let found = false;
                  for (let z in part.Item.data[x][y]) {
                    if (level.filters[y].includes(part.Item.data[x][y][z])) {
                      found = true;
                      break;
                    }
                  }
                  if (!found) {
                    delete part.Item.data[x];
                  }
                } else {
                  if (!level.filters[y].includes(part.Item.data[x][y])) {
                    delete part.Item.data[x];
                  }
                }
              }
            }
          }
        }
        return part;
      }
    case "/api/v1/delete":
      if (event.query.id === undefined)
        return { status: 404, error: "id is required" };
      if (event.query.token === undefined)
        return { status: 404, error: "token is required" };
      level = await _level(event.query.token, event.ip);
      if (level.level < 0 || (event.query.id[0] == "_" && level.level != 99))
        return { status: 405, error: "access denied" };
      return await _delete(event.query.id);
    case "/api/v1/delete_key":
      if (event.query.id === undefined)
        return { status: 404, error: "id is required" };
      if (event.query.key === undefined)
        return { status: 404, error: "key is required" };
      if (event.query.token === undefined)
        return { status: 404, error: "token is required" };
      level = await _level(event.query.token, event.ip);
      if (level.level < 0 || (event.query.id[0] == "_" && level.level != 99))
        return { status: 405, error: "access denied" };
      return await _delete_key(event.query.id, event.query.key);
    case "/api/v1/users_add":
      if (event.query.name === undefined)
        return { status: 404, error: "name is required" };
      if (event.query.key === undefined)
        return { status: 404, error: "key is required" };
      if (event.query.ipr === undefined)
        return { status: 404, error: "ipr is required" };
      if (event.query.level === undefined)
        return { status: 404, error: "level is required" };
      if (event.query.token === undefined)
        return { status: 404, error: "token is required" };
      level = await _level(event.query.token, event.ip);
      if (level.level != 99) return { status: 405, error: "access denied" };
      if (event.query.filters === undefined) event.query.filters = {};
      return await _users_add(
        event.query.name,
        event.query.key,
        event.query.level,
        JSON.parse(event.query.filters),
        event.query.ipr
      );
    case "/api/v1/users_edit":
      if (event.query.filters === undefined)
        return { status: 404, error: "filters is required" };
      if (event.query.key === undefined)
        return { status: 404, error: "key is required" };
      if (event.query.token === undefined)
        return { status: 404, error: "token is required" };
      if (event.query.level === undefined)
        return { status: 404, error: "level is required" };
      level = await _level(event.query.token, event.ip);
      if (level.level != 99) return { status: 405, error: "access denied" };
      return await _users_edit(
        event.query.key,
        JSON.parse(event.query.filters),
        event.query.level
      );
    case "/api/v1/users_del":
      if (event.query.key === undefined)
        return { status: 404, error: "key is required" };
      level = await _level(event.query.token, event.ip);
      if (level.level != 99) return { status: 405, error: "access denied" };
      return await _users_del(event.query.key);
    case "/api/v1/worker":
      if (event.query.vars === undefined)
        return { status: 404, error: "vars is required" };
      if (event.query.id === undefined)
        return { status: 404, error: "id is required" };
      if (event.query.token === undefined)
        return { status: 404, error: "token is required" };
      level = await _level(event.query.token, event.ip);
      if (level.level < 0 || (event.query.id[0] == "_" && level.level != 99))
        return { status: 405, error: "access denied" };
      return await worker1.run(
        event.query.id,
        level.filters,
        event.query.vars.split(","),
        _read,
        _save
      );
    default:
      return { status: 404, error: "Path not allowed", ip: event.ip };
  }
}
// Post
async function post(event) {
  let level = -1;
  switch (event.path) {
    case "/api/v1/save":
      if (event.query.id === undefined)
        return { status: 404, error: "id is required" };
      if (event.query.token === undefined)
        return { status: 404, error: "token is required" };
      level = await _level(event.query.token, event.ip);
      if (level.level < 0 || (event.query.id[0] == "_" && level.level != 99))
        return { status: 405, error: "access denied" };
      if (!_safe(event.body)) return { status: 404, error: "body is required" };
      return await _save(event.query.id, event.body);
    case "/api/v1/push":
      if (event.query.id === undefined)
        return { status: 404, error: "id is required" };
      if (event.query.token === undefined)
        return { status: 404, error: "token is required" };
      level = await _level(event.query.token, event.ip);
      if (level.level < 0 || (event.query.id[0] == "_" && level.level != 99))
        return { status: 405, error: "access denied" };
      if (!_safe(event.body)) return { status: 404, error: "body is required" };
      return await _push(event.query.id, event.body);
    case "/api/v1/put":
      if (event.query.id === undefined)
        return { status: 404, error: "id is required" };
      if (event.query.token === undefined)
        return { status: 404, error: "token is required" };
      level = await _level(event.query.token, event.ip);
      if (level.level < 0 || (event.query.id[0] == "_" && level.level != 99))
        return { status: 405, error: "access denied" };
      if (!_safe(event.body)) return { status: 404, error: "body is required" };
      return await _put(event.query.id, event.body);
    case "/api/v1/login":
      if (!_safe(event.body)) return { status: 404, error: "body is required" };
      return await _login(_safe(event.body), event.ip);
    default:
      return { status: 404, error: "Path not allowed", ip: event.ip };
  }
}
// Safe
function _safe(data) {
  try {
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}
// Save DB
async function _save(id, data) {
  try {
    return {
      status: 200,
      ...(await dynamo
        .put({
          TableName: table_name,
          Item: {
            id: id + app,
            data: data.length < 400 * 1024 ? data : zlib.gzipSync(data),
          },
        })
        .promise()),
    };
  } catch (err) {
    return { status: 404, ...err };
  }
}
// Push DB
async function _push(id, data) {
  let r = await _read(id);
  try {
    data = JSON.parse(data);
    if (r.status === 200) {
      if (r.Item != undefined) {
        if (Array.isArray(r.Item.data)) {
          for (let x in data) {
            if (!r.Item.data.includes(data[x])) r.Item.data.push(data[x]);
          }
          return await _save(id, JSON.stringify(r.Item.data));
        } else {
          return { status: 404, err: "Not an array" };
        }
      } else {
        return await _save(id, JSON.stringify([data[0]]));
      }
    } else {
      return r;
    }
  } catch (err) {
    return { status: 404, ...err };
  }
}
// Put DB
async function _put(id, data) {
  let r = await _read(id);
  try {
    data = JSON.parse(data);
    if (r.status === 200) {
      if (r.Item != undefined) {
        if (!Array.isArray(r.Item.data) && typeof r.Item.data === "object") {
          for (let x in data) {
            r.Item.data[x] = data[x];
          }
          return await _save(id, JSON.stringify(r.Item.data));
        } else {
          return { status: 404, err: "Not an object" };
        }
      } else {
        return await _save(id, JSON.stringify(data));
      }
    } else {
      return r;
    }
  } catch (err) {
    return { status: 404, ...err };
  }
}
// Read DB
async function _read(id) {
  try {
    let r = await dynamo
      .get({
        TableName: table_name,
        Key: {
          id: id + app,
        },
      })
      .promise();
    if (r.Item != undefined) {
      let par_data = _safe(r.Item.data);
      if (par_data == null) {
        try {
          r.Item.data = _safe(zlib.unzipSync(r.Item.data).toString());
        } catch (e) {
          r.Item.data = null;
        }
      } else {
        r.Item.data = par_data;
      }
      r.Item.id = r.Item.id.replace(app, "");
    }
    return {
      status: 200,
      ...r,
    };
  } catch (err) {
    return { status: 404, ...err };
  }
}
// Delete DB
async function _delete(id) {
  try {
    return {
      status: 200,
      ...(await dynamo
        .delete({
          TableName: table_name,
          Key: {
            id: id + app,
          },
        })
        .promise()),
    };
  } catch (err) {
    return { status: 404, ...err };
  }
}
// Delete key DB
async function _delete_key(id, key) {
  let r = await _read(id);
  try {
    if (r.status === 200) {
      if (!Array.isArray(r.Item.data) && typeof r.Item.data === "object") {
        delete r.Item.data[key];
        return await _save(id, JSON.stringify(r.Item.data));
      } else if (Array.isArray(r.Item.data)) {
        r.Item.data = r.Item.data.filter((x) => x != key);
        return await _save(id, JSON.stringify(r.Item.data));
      } else {
        return { status: 404, err: "Not an object or array" };
      }
    } else {
      return r;
    }
  } catch (err) {
    return { status: 404, ...err };
  }
}
// IP baned
async function _ip(ip) {
  if (ip_baned[ip] == undefined) ip_baned[ip] = 0;
  ip_baned[ip]++;
}
// Login
async function _login(data, ip) {
  let country = await fetch("https://ipinfo.io/" + ip + "/country");
  country = "MX\n";
  if (country != "MX\n")
    return { status: 400, error: "access denied (region)", region: country };
  if (data.key === undefined) return { status: 404, error: "key is required" };
  let users = await _read("_users");
  if (users.Item === undefined) {
    await _users_add("admin", data.key, 99, {}, data.key);
    users = await _read("_users");
  } //return { status: 404, error: "Users not found" };
  if (Object.keys(users.Item.data).length == 0) {
    await _users_add("admin", data.key, 99, {}, data.key);
    users = await _read("_users");
  }
  if (users.Item.data[data.key] === undefined)
    return { status: 400, error: "key not found" };
  let token =
    Math.random().toString(36).substring(2) +
    Math.random().toString(36).substring(2) +
    Math.random().toString(36).substring(2);
  delete token_ram[users.Item.data[data.key].token];
  users.Item.data[data.key].token = token;
  users.Item.data[data.key].ip = ip;
  await _save("_users", JSON.stringify(users.Item.data));
  return {
    status: 200,
    token: token,
    filters: users.Item.data[data.key].filters,
    level: users.Item.data[data.key].level,
    name: users.Item.data[data.key].name,
  };
}
// Get level
async function _level(token, ip) {
  // RAM fast cache
  if (token_ram[token] != undefined) {
    if (token_ram[token].ip == ip) {
      return token_ram[token];
    }
  }
  let users = await _read("_users");
  if (users.Item === undefined) return -1;
  for (let x in users.Item.data) {
    if (
      users.Item.data[x].token == token &&
      (users.Item.data[x].ip == ip || users.Item.data[x].ip == "0")
    ) {
      token_ram[token] = {
        level: users.Item.data[x].level,
        ip: ip,
        filters: users.Item.data[x].filters,
      };
      return users.Item.data[x];
    }
  }
  return { level: -1 };
}
// Add user
async function _users_add(name, key, level, filters, ipr) {
  let users = await _read("_users");
  if (users.Item === undefined) users = { Item: { data: {} } }; //return { status: 404, error: "Users not found" };
  users.Item.data[key] = {
    name: name,
    level: level,
    token: "",
    ip: "",
    filters: filters,
    ipr: ipr,
  };
  await _save("_users", JSON.stringify(users.Item.data));
  return { status: 200 };
}
// Edit user
async function _users_edit(key, filters, level) {
  let users = await _read("_users");
  if (users.Item === undefined) users = { Item: { data: {} } }; //return { status: 404, error: "Users not found" };
  if (users.Item.data[key] === undefined)
    return { status: 404, error: "User not found" };
  users.Item.data[key].filters = filters;
  users.Item.data[key].level = level;
  await _save("_users", JSON.stringify(users.Item.data));
  token_ram[users.Item.data[key].token] = {
    level: level,
    ip: users.Item.data[key].ip,
    filters: filters,
  };
  return { status: 200 };
}
// Delete user
async function _users_del(key) {
  let users = await _read("_users");
  if (users.Item === undefined)
    return { status: 404, error: "Users not found" };
  delete users.Item.data[key];
  await _save("_users", JSON.stringify(users.Item.data));
  return { status: 200 };
}
// General
async function fetch(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode != 200) return resolve("MX\n");
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve(data);
      });
    });
  });
}
