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
      description:
        "Search Telecard's complete knowledge base, including uploaded PDFs and manually added text. Use this for Telecard company questions, policies, products, support, contact information, departments, employees, or procedures.",
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
      description:
        "Use this when the user asks for specific employee information such as employee name, email, role, or department. Provide a query string and optionally a result limit.",
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
      description:
        "Use this when the user asks for company information such as company name, industry, location, or website. Provide a query string and optionally a result limit.",
      schema: z.object({
        query: z.string().min(1).max(200),
        limit: z.coerce.number().int().positive().optional(),
      }),
    }
  );

  return [searchKnowledgeBaseTool, searchEmployeeDataTool, searchCompanyDataTool];
}
