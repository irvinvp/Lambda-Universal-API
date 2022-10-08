# Lambda Universal API DynamoDB
API universal para leer, borrar o guardar datos en DyanamoDB, cuenta con sistema de token para usuarios, requiere la creación manual de una variable para el usuario Admin
```
{"super-secret-key-admin":{"token":"","level":99,"ip":"","filters":{}}}
```
Para leer un registro
```
https://<id-lambda>.lambda-url.us-east-2.on.aws/api/v1/read?id=registro&token=XXXXXX
```
Para guardar un registro
```
POST https://<id-lambda>.lambda-url.us-east-2.on.aws/api/v1/save?id=registro&token=XXXXXX
```
Para borrar un registro
```
https://<id-lambda>.lambda-url.us-east-2.on.aws/api/v1/delete?id=registro&token=XXXXXX
```
La tabla de usuarios se encuentra en
```
_users
```
Todas las tablas que comiencen con guion bajo no se pueden accesar mas que por el admin de nivel 99.
## Ejemplo de funciones
```
  async function save(id, data) {
    let x = await fetch(lambda + "save?id=" + id + "&token=" + token, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if(x.status==405) location.reload();
    else return x;
  }
  async function delete_key(id, key) {
    let x = await (
      await fetch(
        lambda + "delete_key?id=" + id + "&token=" + token + "&key=" + key
      )
    ).json();
    if(x.status==405) location.reload();
    else return x;
  }
  async function push(id, data) {
    let x = await fetch(lambda + "push?id=" + id + "&token=" + token, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if(x.status==405) location.reload();
    else return x;
  }
  async function put(id, data) {
    let x = await fetch(lambda + "put?id=" + id + "&token=" + token, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if(x.status==405) location.reload();
    else return x;
  }
  async function read(id) {
    let x = await (
      await fetch(lambda + "read?id=" + id + "&token=" + token)
    ).json();
    if(x.status==405) location.reload();
    else return x;
  }
  async function login(data) {
    return await (
      await fetch(lambda + "login", {
        method: "POST",
        body: JSON.stringify(data),
      })
    ).json();
  }
  async function worker(id, vars) {
    let x = await (
      await fetch(
        lambda + "worker?id=" + id + "&token=" + token + "&vars=" + vars
      )
    ).json();
    if(x.status==405) location.reload();
    else return x;
  }
  async function users_edit(key, filters, level) {
    let x = await (
      await fetch(
        lambda +
          "users_edit?token=" +
          token +
          "&key=" +
          key +
          "&filters=" +
          filters +
          "&level=" +
          level
      )
    ).json();
    if(x.status==405) location.reload();
    else return x;
  }
  async function users_del(key) {
    let x = await (
      await fetch(lambda + "users_del?token=" + token + "&key=" + key)
    ).json();
    if(x.status==405) location.reload();
    else return x;
  }
  async function users_add(name, key, filters, level, ipr) {
    let x = await (
      await fetch(
        lambda +
          "users_add?token=" +
          token +
          "&name=" +
          name +
          "&key=" +
          key +
          "&level=" +
          level +
          "&filters=" +
          filters +
          "&ipr=" +
          ipr
      )
    ).json();
    if(x.status==405) location.reload();
    else return x;
  }
```
