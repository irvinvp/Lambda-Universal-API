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
