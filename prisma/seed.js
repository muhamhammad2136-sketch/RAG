import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

const companiesData = [
  { name: "Nexora Tech", industry: "Software", location: "Karachi, PK", website: "https://nexora.io" },
  { name: "Bluewave Systems", industry: "Cloud Services", location: "Lahore, PK", website: "https://bluewave.dev" },
  { name: "Finlytics Corp", industry: "FinTech", location: "Karachi, PK", website: "https://finlytics.com" },
  { name: "GreenGrid Energy", industry: "Renewable Energy", location: "Islamabad, PK", website: "https://greengrid.pk" },
  { name: "Medisync Health", industry: "Healthcare", location: "Karachi, PK", website: "https://medisync.io" },
  { name: "Orbit Logistics", industry: "Supply Chain", location: "Lahore, PK", website: "https://orbitlog.com" },
  { name: "Pixel Forge Studios", industry: "Gaming", location: "Karachi, PK", website: "https://pixelforge.dev" },
  { name: "Quantum Retail", industry: "E-commerce", location: "Faisalabad, PK", website: "https://quantumretail.pk" },
  { name: "Skyline Realty", industry: "Real Estate", location: "Karachi, PK", website: "https://skylinerealty.pk" },
  { name: "Vertex Education", industry: "EdTech", location: "Islamabad, PK", website: "https://vertexedu.io" },
];

// Each entry: [companyIndex, departmentName]
const departmentsData = [
  [0, "Engineering"],
  [0, "Product"],
  [1, "Cloud Infrastructure"],
  [1, "Customer Success"],
  [2, "Risk & Compliance"],
  [2, "Engineering"],
  [3, "Field Operations"],
  [4, "Clinical Research"],
  [4, "Engineering"],
  [5, "Warehouse Ops"],
  [6, "Game Design"],
  [6, "QA"],
  [7, "Marketing"],
  [8, "Sales"],
  [9, "Curriculum"],
];

// Each entry: [departmentIndex, name, role, salary]
const employeesData = [
  [0, "Ahmed Raza", "Backend Engineer", 180000],
  [0, "Sana Malik", "Frontend Engineer", 170000],
  [0, "Bilal Hussain", "DevOps Engineer", 200000],
  [1, "Ayesha Khan", "Product Manager", 220000],
  [2, "Usman Tariq", "Cloud Architect", 250000],
  [2, "Hina Sheikh", "Site Reliability Engineer", 210000],
  [3, "Zainab Iqbal", "Support Lead", 130000],
  [4, "Fahad Siddiqui", "Compliance Analyst", 160000],
  [5, "Mariam Farooq", "Backend Engineer", 175000],
  [6, "Hamza Younus", "Field Technician", 90000],
  [7, "Nida Aslam", "Research Scientist", 240000],
  [8, "Talha Aziz", "Full Stack Engineer", 190000],
  [9, "Sadia Karim", "Warehouse Supervisor", 95000],
  [10, "Owais Mughal", "Game Designer", 150000],
  [10, "Rabia Noor", "3D Artist", 145000],
  [11, "Junaid Baig", "QA Engineer", 120000],
  [12, "Mehwish Anwar", "Marketing Manager", 165000],
  [13, "Saad Qureshi", "Sales Executive", 110000],
  [14, "Alina Yousuf", "Curriculum Designer", 135000],
  [1, "Kashif Rehman", "Product Analyst", 155000],
];

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.company.deleteMany();

  const companies = [];
  for (const c of companiesData) {
    const company = await prisma.company.create({ data: c });
    companies.push(company);
  }
  console.log(`✅ Created ${companies.length} companies`);

  const departments = [];
  for (const [companyIndex, name] of departmentsData) {
    const department = await prisma.department.create({
      data: { name, companyId: companies[companyIndex].id },
    });
    departments.push(department);
  }
  console.log(`✅ Created ${departments.length} departments`);

  let employeeCount = 0;
  for (const [deptIndex, name, role, salary] of employeesData) {
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`;
    await prisma.employee.create({
      data: { name, email, role, salary, departmentId: departments[deptIndex].id },
    });
    employeeCount++;
  }
  console.log(`✅ Created ${employeeCount} employees`);

  console.log("🌱 Seeding complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });