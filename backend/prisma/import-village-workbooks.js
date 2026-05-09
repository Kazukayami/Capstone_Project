const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const BATCH_SIZE = 5000;

function normalizeCode(value, width) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.padStart(width, "0");
}

function normalizeName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function createManyInChunks(model, rows) {
  for (const batch of chunk(rows, BATCH_SIZE)) {
    await model.createMany({ data: batch, skipDuplicates: true });
  }
}

function readWorkbookRows(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false
    });

    const headerIndex = rows.findIndex((row) => {
      return row.some((cell) => String(cell).trim().toUpperCase() === "MDDS STC");
    });

    if (headerIndex !== -1) {
      return rows.slice(headerIndex + 1);
    }
  }
  throw new Error(`Could not find header row in ${filePath}`);
}

function collectFromFile(filePath, collections) {
  const rows = readWorkbookRows(filePath);
  let villages = 0;

  for (const row of rows) {
    const stateCode = normalizeCode(row[0], 2);
    const stateName = normalizeName(row[1]);
    const districtCode = normalizeCode(row[2], 3);
    const districtName = normalizeName(row[3]);
    const subDistrictCode = normalizeCode(row[4], 5);
    const subDistrictName = normalizeName(row[5]);
    const villageCode = normalizeCode(row[6], 6);
    const villageName = normalizeName(row[7]);

    if (!stateCode || !stateName) continue;
    collections.states.set(stateCode, { code: stateCode, name: stateName });

    if (districtCode === "000" || !districtName) continue;
    const districtKey = `${stateCode}:${districtCode}`;
    collections.districts.set(districtKey, {
      stateCode,
      code: districtCode,
      name: districtName
    });

    if (subDistrictCode === "00000" || !subDistrictName) continue;
    const subDistrictKey = `${districtKey}:${subDistrictCode}`;
    collections.subDistricts.set(subDistrictKey, {
      districtKey,
      code: subDistrictCode,
      name: subDistrictName
    });

    if (villageCode === "000000" || !villageName) continue;
    collections.villages.push({
      subDistrictKey,
      censusCode: villageCode,
      name: villageName
    });
    villages += 1;
  }

  console.log(`${path.basename(filePath)}: collected ${villages} villages`);
}

async function importCollections(collections) {
  console.log("Clearing old location data...");
  await prisma.village.deleteMany();
  await prisma.subDistrict.deleteMany();
  await prisma.district.deleteMany();
  await prisma.state.deleteMany();

  console.log(`Creating ${collections.states.size} states...`);
  await createManyInChunks(prisma.state, [...collections.states.values()]);

  const states = await prisma.state.findMany({ select: { id: true, code: true } });
  const stateIds = new Map(states.map((state) => [state.code, state.id]));

  const districtRows = [...collections.districts.values()].map((district) => ({
    code: district.code,
    name: district.name,
    stateId: stateIds.get(district.stateCode)
  }));

  console.log(`Creating ${districtRows.length} districts...`);
  await createManyInChunks(prisma.district, districtRows);

  const districts = await prisma.district.findMany({
    select: { id: true, code: true, state: { select: { code: true } } }
  });
  const districtIds = new Map(districts.map((district) => [`${district.state.code}:${district.code}`, district.id]));

  const subDistrictRows = [...collections.subDistricts.values()].map((subDistrict) => ({
    code: subDistrict.code,
    name: subDistrict.name,
    districtId: districtIds.get(subDistrict.districtKey)
  }));

  console.log(`Creating ${subDistrictRows.length} sub-districts...`);
  await createManyInChunks(prisma.subDistrict, subDistrictRows);

  const subDistricts = await prisma.subDistrict.findMany({
    select: {
      id: true,
      code: true,
      district: { select: { code: true, state: { select: { code: true } } } }
    }
  });
  const subDistrictIds = new Map(
    subDistricts.map((subDistrict) => [
      `${subDistrict.district.state.code}:${subDistrict.district.code}:${subDistrict.code}`,
      subDistrict.id
    ])
  );

  const villageRows = collections.villages
    .map((village) => ({
      censusCode: village.censusCode,
      name: village.name,
      subDistrictId: subDistrictIds.get(village.subDistrictKey)
    }))
    .filter((village) => village.subDistrictId);

  console.log(`Creating ${villageRows.length} villages...`);
  await createManyInChunks(prisma.village, villageRows);
}

async function main() {
  const datasetDir = process.argv[2];
  if (!datasetDir) {
    throw new Error("Usage: node prisma/import-village-workbooks.js path/to/dataset-folder");
  }

  const files = fs
    .readdirSync(datasetDir)
    .filter((file) => /\.(xls|xlsx|ods)$/i.test(file) && !file.startsWith("._"))
    .sort()
    .map((file) => path.join(datasetDir, file));

  if (!files.length) {
    throw new Error(`No workbook files found in ${datasetDir}`);
  }

  const collections = {
    states: new Map(),
    districts: new Map(),
    subDistricts: new Map(),
    villages: []
  };

  for (const file of files) {
    collectFromFile(file, collections);
  }

  await importCollections(collections);

  const [states, districts, subDistricts, villages] = await Promise.all([
    prisma.state.count(),
    prisma.district.count(),
    prisma.subDistrict.count(),
    prisma.village.count()
  ]);

  console.log("Import complete.");
  console.log({ states, districts, subDistricts, villages });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    prisma.$disconnect();
  });
