import fs from "fs";
import path from "path";

export interface Target {
  company: string;
  website: string;
  firstName: string;
  email: string;
  title: string;
  employees: string;
  fundingStage: string;
  estArr: string;
  currentHelpdesk: string;
  personalization: string;
}

export function loadTargets(filePath: string): Target[] {
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, "utf-8");

  if (ext === ".json") {
    return parseJson(raw);
  }
  if (ext === ".csv") {
    return parseCsv(raw);
  }
  throw new Error(`Unsupported file format: ${ext}. Use .json or .csv`);
}

function parseJson(raw: string): Target[] {
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error("JSON target file must be an array of target objects");
  }
  return data.map(validateTarget);
}

function parseCsv(raw: string): Target[] {
  const lines = raw.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV must have a header row and at least one data row");
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const requiredHeaders = ["company", "email", "firstname"];
  for (const req of requiredHeaders) {
    if (!headers.includes(req)) {
      throw new Error(`CSV missing required column: ${req}`);
    }
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = values[i]?.trim() || "";
    });
    return validateTarget({
      company: record.company,
      website: record.website,
      firstName: record.firstname,
      email: record.email,
      title: record.title,
      employees: record.employees,
      fundingStage: record.fundingstage || record["funding_stage"],
      estArr: record.estarr || record["est_arr"],
      currentHelpdesk: record.currenthelpdesk || record["current_helpdesk"],
      personalization: record.personalization,
    });
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function validateTarget(obj: Record<string, unknown>): Target {
  const company = String(obj.company || "").trim();
  const email = String(obj.email || "").trim();
  if (!company) throw new Error("Target missing required field: company");
  if (!email) throw new Error(`Target "${company}" missing required field: email`);

  return {
    company,
    website: String(obj.website || "").trim(),
    firstName: String(obj.firstName || "").trim(),
    email,
    title: String(obj.title || "").trim(),
    employees: String(obj.employees || "").trim(),
    fundingStage: String(obj.fundingStage || "").trim(),
    estArr: String(obj.estArr || "").trim(),
    currentHelpdesk: String(obj.currentHelpdesk || "").trim(),
    personalization: String(obj.personalization || "").trim(),
  };
}
