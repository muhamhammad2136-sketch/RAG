import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { searchKnowledgeBase } from "../services/knowledgeService.js";
// import { searchEmployees } from "../services/employeeService.js";
// import { searchCompanies } from "../services/companyService.js";
// import { searchDepartments } from "../services/departmentService.js";


export function createTools(vectorStore) {
  const searchKnowledgeBaseTool = tool(
    async ({ query }) => {
      console.log("Tool Called")
      if (!vectorStore) {
        return "No knowledge base has been uploaded yet.";
      }
      return await searchKnowledgeBase(vectorStore, query);
    },
    {
      name: "search_knowledge_base",
      description:
"Search Telecard's complete knowledge base, including uploaded PDFs and manually added text. Always use this tool to answer any question about Telecard, its employees, policies, products, contact information, phone numbers, departments, CEO, HR, or company procedures.",
      schema: z.object({
        query: z.string().min(1).max(500),
      }),
    }
  );

  // const searchEmployeesTool = tool(
  //   async (input) => {
  //     return await searchEmployees(input);
  //   },
  //   {
  //     name: "search_employees",
  //     description:
  //       "Search employees by employee name, role, company name, or department.",
  //     schema: z.object({
  //       name: z.string().optional(),
  //       role: z.string().optional(),
  //       companyName: z.string().optional(),
  //       departmentName: z.string().optional(),
  //     }),
  //   }
  // );

  // const searchCompaniesTool = tool(
  //   async (input) => {
  //     return await searchCompanies(input);
  //   },
  //   {
  //     name: "search_companies",
  //     description: "Search companies by company name or industry.",
  //     schema: z.object({
  //       name: z.string().optional(),
  //       industry: z.string().optional(),
  //     }),
  //   }
  // );

  // const searchDepartmentsTool = tool(
  //   async (input) => {
  //     return await searchDepartments(input);
  //   },
  //   {
  //     name: "search_departments",
  //     description: "Search departments and return employees working in them.",
  //     schema: z.object({
  //       departmentName: z.string().optional(),
  //     }),
  //   }
  // );

  return [
    searchKnowledgeBaseTool,
    // searchEmployeesTool,
    // searchCompaniesTool,
    // searchDepartmentsTool,
  ];
}