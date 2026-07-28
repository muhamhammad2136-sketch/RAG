import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { searchKnowledgeBase } from "../services/knowledgeService.js";
import {
  searchEmployeeData,
  searchCompanyData,
} from "../services/companyEmployeeService.js";

export function createTools(vectorStore) {
  const searchKnowledgeBaseTool = tool(
    async ({ query }) => {
      if (!vectorStore) {
        return "No knowledge base has been uploaded yet.";
      }

      return await searchKnowledgeBase(vectorStore, query);
    },
    {
      name: "search_knowledge_base",
      description: `
Search Telecard's official knowledge base.

Use this tool ONLY for:
- Products
- Services
- Packages
- Plans
- Pricing
- FAQs
- Policies
- Support
- Documentation
- General Telecard information

Do NOT use this tool for:
- Employee lookup
- Company lookup

IMPORTANT RULES:
- Preserve the user's wording as much as possible.
- Do NOT unnecessarily rewrite the user's query.
- Do NOT expand the query with additional company names or assumptions.
- Do NOT guess missing information.
- Only resolve obvious pronouns like "it", "they", or "that product" when the reference is completely clear.
- If the request is ambiguous, ask the user for clarification instead of searching.
- Maximum two searches per user question.
`,
      schema: z.object({
        query: z.string().min(1).max(500),
      }),
    }
  );

  const searchEmployeeDataTool = tool(
    async ({ query, limit }) => {
      try {
        return await searchEmployeeData(query, limit);
      } catch (error) {
        return `Employee lookup failed: ${error.message}`;
      }
    },
    {
      name: "search_employee_data",
      description: `
Search Telecard employee records.

Use ONLY when the user asks about:
- Employee names
- Employee emails
- Job titles
- Departments
- Managers
- Staff members
- Employee roles

Examples:
- Find employee Ali
- Show Mariam Farooq
- Backend Engineer
- HR department employees
- Manager email

Do NOT use this tool for company information.

IMPORTANT RULES:
- Keep the query as close as possible to the user's original wording.
- Do NOT add company names unless the user explicitly mentioned them.
- Do NOT infer hidden context.
- Do NOT rewrite "CEO number" into "Bluewave Systems CEO number".
- If the employee is not clearly identified, ask for clarification before searching.
- Perform only one search unless the user provides additional details.
`,
      schema: z.object({
        query: z.string().min(1).max(200),
        limit: z.coerce.number().int().positive().optional(),
      }),
    }
  );

  const searchCompanyDataTool = tool(
    async ({ query, limit }) => {
      try {
        return await searchCompanyData(query, limit);
      } catch (error) {
        return `Company lookup failed: ${error.message}`;
      }
    },
    {
      name: "search_company_data",
      description: `
Search Telecard company records.

Use ONLY when the user asks about:
- Company names
- Company websites
- Company industries
- Company locations
- Office addresses
- Company details

Examples:
- Find Bluewave Systems
- Companies in Lahore
- FinTech companies
- Bluewave website
- Show software companies

Do NOT use this tool for employee lookup.

IMPORTANT RULES:
- Preserve the user's original wording whenever possible.
- Do NOT rewrite or unnecessarily expand the query.
- Do NOT insert company names that the user did not explicitly mention.
- Do NOT infer hidden context.
- If the company is unclear, ask the user which company they mean before searching.
- Perform only one search unless the user provides additional clarification.
`,
      schema: z.object({
        query: z.string().min(1).max(200),
        limit: z.coerce.number().int().positive().optional(),
      }),
    }
  );

  return [
    searchKnowledgeBaseTool,
    searchEmployeeDataTool,
    searchCompanyDataTool,
  ];
}