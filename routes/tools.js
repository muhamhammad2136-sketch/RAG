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
        "Search Telecard's product/service knowledge base. Use for: products, plans, packages, pricing, FAQs, policies, support, documentation. Not for employees or companies. Pass the user's query mostly unchanged.",
      schema: z.object({
        query: z.string().min(1).max(500).describe("The user's question, close to their original wording."),
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
        "Search Telecard employee records: names, emails, job titles, departments, managers. Not for company info. Pass the user's query mostly unchanged; do not add a company name the user did not say.",
      schema: z.object({
        query: z.string().min(1).max(200).describe("Employee-related search terms, close to the user's wording."),
        limit: z.coerce.number().int().positive().optional().describe("Max results to return."),
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
        "Search Telecard company records: company names, websites, industries, locations. Not for employee info. Pass the user's query mostly unchanged.",
      schema: z.object({
        query: z.string().min(1).max(200).describe("Company-related search terms, close to the user's wording."),
        limit: z.coerce.number().int().positive().optional().describe("Max results to return."),
      }),
    }
  );

  return [
    searchKnowledgeBaseTool,
    searchEmployeeDataTool,
    searchCompanyDataTool,
  ];
}