import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLA = process.env.TABLA;
const JUEGO = "serpiente";
const MAX_PUNTOS = 397; // tablero 20x20 = 400 celdas, la serpiente empieza con 3

const respuesta = (status, body) => ({
  statusCode: status,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  const metodo = event.requestContext.http.method;

  // GET /puntuaciones → top 10
  if (metodo === "GET") {
    const r = await db.send(new QueryCommand({
      TableName: TABLA,
      KeyConditionExpression: "juego = :j",
      ExpressionAttributeValues: { ":j": JUEGO },
      ScanIndexForward: false, // de mayor a menor
      Limit: 10,
    }));
    return respuesta(200, r.Items.map(({ nombre, puntos, fecha }) => ({ nombre, puntos, fecha })));
  }

  // POST /puntuaciones → guardar una puntuación
  if (metodo === "POST") {
    let datos;
    try {
      const texto = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString() : event.body;
      datos = JSON.parse(texto || "{}");
    } catch {
      return respuesta(400, { error: "JSON inválido" });
    }

    const nombre = String(datos.nombre ?? "").trim();
    const puntos = Number(datos.puntos);
    if (!/^[\p{L}\p{N} _-]{1,12}$/u.test(nombre)) {
      return respuesta(400, { error: "Nombre inválido (1-12 letras, números, espacio, _ o -)" });
    }
    if (!Number.isInteger(puntos) || puntos < 1 || puntos > MAX_PUNTOS) {
      return respuesta(400, { error: "Puntos inválidos" });
    }

    const fecha = new Date().toISOString();
    await db.send(new PutCommand({
      TableName: TABLA,
      Item: {
        juego: JUEGO,
        orden: `${String(puntos).padStart(4, "0")}#${fecha}#${randomUUID().slice(0, 8)}`,
        nombre,
        puntos,
        fecha,
      },
    }));
    return respuesta(201, { ok: true });
  }

  return respuesta(405, { error: "Método no permitido" });
};