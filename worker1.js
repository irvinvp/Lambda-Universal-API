async function run(fun, filters, vars, _read, _save) {
  if (fun == "example") {
    return await example(fun, filters, vars, _read, _save);
  } else {
    return { status: 400 };
  }
}
async function example(fun, filters, vars, _read, _save) {
  return {
    status: 200,
    function: fun
  };
}
