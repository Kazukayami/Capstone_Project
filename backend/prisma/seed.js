const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const data = [
  {
    name: "Maharashtra",
    code: "MH",
    districts: [
      {
        name: "Pune",
        code: "PUN",
        subDistricts: [
          {
            name: "Haveli",
            code: "HAV",
            villages: [
              { name: "Wagholi", censusCode: "556001", pincode: "412207", latitude: 18.5808, longitude: 73.9862, population: 43800 },
              { name: "Manjari Budruk", censusCode: "556002", pincode: "412307", latitude: 18.5074, longitude: 73.9785, population: 31200 }
            ]
          },
          {
            name: "Mulshi",
            code: "MUL",
            villages: [
              { name: "Pirangut", censusCode: "556003", pincode: "412115", latitude: 18.5111, longitude: 73.6798, population: 18100 },
              { name: "Lavale", censusCode: "556004", pincode: "412115", latitude: 18.5363, longitude: 73.7333, population: 9200 }
            ]
          }
        ]
      },
      {
        name: "Nashik",
        code: "NSK",
        subDistricts: [
          {
            name: "Niphad",
            code: "NIP",
            villages: [
              { name: "Lasalgaon", censusCode: "557001", pincode: "422306", latitude: 20.1425, longitude: 74.2396, population: 28700 }
            ]
          }
        ]
      }
    ]
  },
  {
    name: "Karnataka",
    code: "KA",
    districts: [
      {
        name: "Bengaluru Urban",
        code: "BLU",
        subDistricts: [
          {
            name: "Bengaluru South",
            code: "BGS",
            villages: [
              { name: "Kengeri", censusCode: "558001", pincode: "560060", latitude: 12.9081, longitude: 77.4877, population: 56100 },
              { name: "Begur", censusCode: "558002", pincode: "560068", latitude: 12.8788, longitude: 77.6377, population: 40800 }
            ]
          }
        ]
      },
      {
        name: "Mysuru",
        code: "MYS",
        subDistricts: [
          {
            name: "Nanjangud",
            code: "NAN",
            villages: [
              { name: "Hullahalli", censusCode: "558003", pincode: "571314", latitude: 12.0863, longitude: 76.6928, population: 15400 }
            ]
          }
        ]
      }
    ]
  }
];

async function main() {
  await prisma.apiRequestLog.deleteMany();
  await prisma.apiClient.deleteMany();
  await prisma.village.deleteMany();
  await prisma.subDistrict.deleteMany();
  await prisma.district.deleteMany();
  await prisma.state.deleteMany();

  for (const state of data) {
    await prisma.state.create({
      data: {
        name: state.name,
        code: state.code,
        districts: {
          create: state.districts.map((district) => ({
            name: district.name,
            code: district.code,
            subDistricts: {
              create: district.subDistricts.map((subDistrict) => ({
                name: subDistrict.name,
                code: subDistrict.code,
                villages: { create: subDistrict.villages }
              }))
            }
          }))
        }
      }
    });
  }

  await prisma.apiClient.create({
    data: {
      name: "Demo B2B Client",
      apiKey: "demo_key_123",
      apiSecret: "demo_secret_456",
      plan: "growth"
    }
  });

  console.log("Seed data created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

