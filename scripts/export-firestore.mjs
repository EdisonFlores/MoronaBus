import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import admin from "firebase-admin";

const OUTPUT_DIR = path.resolve("data", "firestore");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");

const DATASETS = {
  lugares: { collection: "lugar", group: "lugares" },
  eventos: { collection: "eventosms", group: "eventos" },
  "lineas-urbanas": { collection: "lineas_transporte", group: "transporte" },
  "lineas-rurales": { collection: "lineas_rurales", group: "transporte" },
  "paradas-urbanas": { collection: "paradas_transporte", group: "transporte" },
  "paradas-rurales": { collection: "paradas_rurales", group: "transporte" },
  provincias: { collection: "provincias", group: "division-territorial" },
  cantones: { collection: "cantones", group: "division-territorial" },
  parroquias: { collection: "parroquias", group: "division-territorial" }
};

const VALID_GROUPS = new Set([
  "todas",
  "lugares",
  "eventos",
  "transporte",
  "division-territorial"
]);

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

function getFirestore() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: requiredEnv("FIREBASE_PROJECT_ID"),
        clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
        privateKey: requiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n")
      })
    });
  }

  return admin.firestore();
}

function toPublicJson(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(toPublicJson);

  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof admin.firestore.GeoPoint) {
    return { latitude: value.latitude, longitude: value.longitude };
  }

  if (value instanceof admin.firestore.DocumentReference) {
    return value.path;
  }

  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString("base64");

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, toPublicJson(nested)])
    );
  }

  return value;
}

function stableSort(value) {
  if (Array.isArray(value)) return value.map(stableSort);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(key => [key, stableSort(value[key])])
  );
}

function serialize(data) {
  return `${JSON.stringify(stableSort(data), null, 2)}\n`;
}

function contentVersion(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

async function readManifest() {
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return { schemaVersion: 1, generatedAt: null, datasets: {} };
  }
}

async function removeOldVersions(datasetName, keepFile) {
  const prefix = `${datasetName}.v`;
  const files = await readdir(OUTPUT_DIR);

  await Promise.all(
    files
      .filter(file => file.startsWith(prefix) && file.endsWith(".json") && file !== keepFile)
      .map(file => unlink(path.join(OUTPUT_DIR, file)))
  );
}

function selectedDatasets(group) {
  return Object.entries(DATASETS).filter(([, config]) => (
    group === "todas" || config.group === group
  ));
}

async function exportDataset(db, name, config) {
  const snapshot = await db.collection(config.collection).get();
  const documents = snapshot.docs
    .map(doc => ({ id: doc.id, ...toPublicJson(doc.data()) }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const content = serialize(documents);
  const version = contentVersion(content);
  const file = `${name}.v${version}.json`;

  await writeFile(path.join(OUTPUT_DIR, file), content, "utf8");
  await removeOldVersions(name, file);

  return {
    collection: config.collection,
    file,
    version,
    documents: documents.length
  };
}

async function main() {
  const group = String(process.argv[2] || "todas").trim().toLowerCase();
  if (!VALID_GROUPS.has(group)) {
    throw new Error(`Grupo no valido: ${group}. Usa: ${[...VALID_GROUPS].join(", ")}`);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const db = getFirestore();
  const manifest = await readManifest();
  const chosen = selectedDatasets(group);
  let hasDataChanges = false;

  console.log(`Exportando grupo: ${group}`);

  for (const [name, config] of chosen) {
    const result = await exportDataset(db, name, config);
    const previous = manifest.datasets[name];
    if (!previous || previous.version !== result.version) hasDataChanges = true;
    manifest.datasets[name] = result;
    console.log(`- ${name}: ${result.documents} documentos -> ${result.file}`);
  }

  if (hasDataChanges) {
    manifest.schemaVersion = 1;
    manifest.generatedAt = new Date().toISOString();
    manifest.exportedGroup = group;
    await writeFile(MANIFEST_PATH, serialize(manifest), "utf8");
    console.log(`Manifiesto actualizado: ${MANIFEST_PATH}`);
  } else {
    console.log("Los datos no cambiaron; se conserva el manifiesto actual.");
  }
}

main().catch(error => {
  console.error("No se pudo exportar Firestore:", error);
  process.exitCode = 1;
});
