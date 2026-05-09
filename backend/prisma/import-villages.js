const fs = require("fs");
const readline = require("readline");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function toRecord(headers, values) {
  return headers.reduce((record, header, index) => {
    record[header] = values[index] || "";
    return record;
  }, {});
}

async function upsertVillage(row) {
  const state = await prisma.state.upsert({
    where: { code: row.state_code },
    update: { name: row.state_name },
    create: { code: row.state_code, name: row.state_name }
  });

  const district = await prisma.district.upsert({
    where: { stateId_code: { stateId: state.id, code: row.district_code } },
    update: { name: row.district_name },
    create: { stateId: state.id, code: row.district_code, name: row.district_name }
  });

  const subDistrict = await prisma.subDistrict.upsert({
    where: { districtId_code: { districtId: district.id, code: row.sub_district_code } },
    update: { name: row.sub_district_name },
    create: { districtId: district.id, code: row.sub_district_code, name: row.sub_district_name }
  });

  await prisma.village.upsert({
    where: { subDistrictId_censusCode: { subDistrictId: subDistrict.id, censusCode: row.village_code } },
    update: {
      name: row.village_name,
      pincode: row.pincode || null,
      population: row.population ? Number(row.population) : null,
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null
    },
    create: {
      subDistrictId: subDistrict.id,
      censusCode: row.village_code,
      name: row.village_name,
      pincode: row.pincode || null,
      population: row.population ? Number(row.population) : null,
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null
    }
  });
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    throw new Error("Usage: node prisma/import-villages.js path/to/villages.csv");
  }

  const stream = fs.createReadStream(csvPath);
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let headers = [];
  let count = 0;

  for await (const line of lines) {
    if (!line.trim()) continue;
    const values = parseCsvLine(line);

    if (!headers.length) {
      headers = values;
      continue;
    }

    await upsertVillage(toRecord(headers, values));
    count += 1;

    if (count % 500 === 0) {
      console.log(`Imported ${count} villages...`);
    }
  }

  console.log(`Import complete. Imported ${count} villages.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

