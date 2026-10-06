# 🐍 Serpiente Neón

Juego de la serpiente en el navegador con **ranking global**, desplegado en AWS con una arquitectura serverless.

**Jugar:** https://d362rmgr5au2ha.cloudfront.net

## Arquitectura

```
Navegador ──► CloudFront ──► S3                          (el juego: index.html)
    │
    └─ fetch ─► API Gateway ──► Lambda ──► DynamoDB      (el ranking)
```

| Pieza | Servicio | Qué hace |
|---|---|---|
| Archivos del juego | **Amazon S3** | Guarda `index.html`. El bucket es privado. |
| Entrega y HTTPS | **Amazon CloudFront** | CDN que sirve el juego desde el servidor más cercano al jugador. Lee el bucket mediante *Origin Access Control* (OAC). |
| API | **Amazon API Gateway** (HTTP API) | Expone `GET /puntuaciones` y `POST /puntuaciones`, con CORS limitado al dominio del juego y throttling. |
| Lógica | **AWS Lambda** (Node.js) | Valida y guarda puntuaciones, y devuelve el top 10. Código en [`lambda/index.mjs`](lambda/index.mjs). |
| Datos | **Amazon DynamoDB** | Tabla `serpiente-puntuaciones`, en modo on-demand. |
| Permisos | **AWS IAM** | La Lambda usa un rol con permiso solo para `dynamodb:Query` y `dynamodb:PutItem` sobre su tabla. |

## Decisiones de diseño

- **Bucket privado + OAC:** nadie puede leer el bucket directamente; solo la distribución de CloudFront.
- **Clave de DynamoDB pensada para la consulta:** partition key `juego` y sort key `orden` con el formato `0042#<fecha>#<id>`. El puntaje con ceros a la izquierda hace que el orden de texto coincida con el numérico. Así el top 10 sale de un `Query` ordenado de mayor a menor, sin escanear la tabla, y dos puntajes iguales no se pisan.
- **Mínimo privilegio:** la función solo puede hacer las dos operaciones que necesita, sobre una sola tabla.
- **No confiar en el cliente:** la Lambda valida el nombre (1–12 caracteres seguros) y que los puntos sean posibles (1–397), y el frontend muestra los nombres con `textContent` para evitar XSS.
- **CORS y throttling:** la API solo acepta llamadas de navegador desde el dominio del juego y limita las peticiones por segundo para controlar costos.

## Estructura

```
index.html        Juego completo (HTML + CSS + JS, sin dependencias)
lambda/index.mjs  Función Lambda del ranking
```
