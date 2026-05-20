import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { Command } from "commander";

const ROOT_DIR = path.resolve(process.cwd());
const DEFAULT_ROOT_DIR = path.join(ROOT_DIR, "data", "assets", "files");
const DEFAULT_TASKS_PATH = path.join(ROOT_DIR, "data", "output", "logo-webp-tasks.json");
const DEFAULT_STATE_PATH = path.join(ROOT_DIR, "data", "output", "logo-webp-processed.json");
const EDITOR_CLI = path.resolve(ROOT_DIR, "..", "editor_imagem", "src", "cli.js");

function isValidBgColor(value) {
  if (!value || typeof value !== "string") return false;
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("#")) return true;
  if (/^rgb(a)?\(/i.test(v)) return true;
  return false;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfExists(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

async function scanTasks(rootDir) {
  const tasks = [];
  const stack = [rootDir];

  while (stack.length) {
    const dir = stack.pop();
    if (!dir) break;

    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    let hasLogo = false;
    let hasConfig = false;

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".")) continue;
        stack.push(path.join(dir, entry.name));
        continue;
      }
      if (entry.isFile()) {
        if (entry.name === "logo.png") hasLogo = true;
        if (entry.name === "config.json") hasConfig = true;
      }
    }

    if (!hasLogo || !hasConfig) continue;

    const logoPngPath = path.join(dir, "logo.png");
    const configPath = path.join(dir, "config.json");
    const config = await readJsonIfExists(configPath, null);
    const backgroundColor = config && typeof config === "object" ? config?.css?.backgroundColor : null;

    tasks.push({
      dir,
      logoPngPath,
      configPath,
      backgroundColor: typeof backgroundColor === "string" ? backgroundColor : null,
    });
  }

  return tasks;
}

function runEditorBgWebp({ inputPngPath, backgroundColor, outputWebpPath }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [EDITOR_CLI, "bg-webp", "--input", inputPngPath, "--bg", backgroundColor, "--output", outputWebpPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      try {
        const parsed = JSON.parse(stdout || "{}");
        if (parsed && typeof parsed === "object") {
          if (parsed.ok === true) return resolve(parsed);
          return reject(new Error(parsed.error || stderr || `Falha ao processar imagem (code ${code}).`));
        }
        return reject(new Error(stderr || `Resposta inválida do editor_imagem (code ${code}).`));
      } catch {
        return reject(new Error(stderr || `Resposta inválida do editor_imagem (code ${code}).`));
      }
    });
  });
}

async function processTasks({ tasksPath, statePath }) {
  const tasksDoc = await readJsonIfExists(tasksPath, null);
  const tasks = Array.isArray(tasksDoc?.tasks) ? tasksDoc.tasks : Array.isArray(tasksDoc) ? tasksDoc : [];

  const state = await readJsonIfExists(statePath, {});
  const processed = state && typeof state === "object" ? state : {};

  for (const task of tasks) {
    const dir = typeof task?.dir === "string" ? task.dir : null;
    const logoPngPath = typeof task?.logoPngPath === "string" ? task.logoPngPath : null;
    const backgroundColor = typeof task?.backgroundColor === "string" ? task.backgroundColor : null;

    if (!dir || !logoPngPath || !(await fileExists(logoPngPath))) {
      continue;
    }

    const key = logoPngPath;
    const outputWebpPath = path.join(dir, "logo.webp");

    if (!isValidBgColor(backgroundColor)) {
      processed[key] = {
        ok: false,
        outputPath: outputWebpPath,
        backgroundColor,
        processedAt: new Date().toISOString(),
        error: "backgroundColor inválido ou ausente.",
      };
      await writeJson(statePath, processed);
      continue;
    }

    try {
      const result = await runEditorBgWebp({ inputPngPath: logoPngPath, backgroundColor, outputWebpPath });
      processed[key] = {
        ok: true,
        outputPath: result.outputPath || outputWebpPath,
        backgroundColor,
        processedAt: new Date().toISOString(),
      };
      await writeJson(statePath, processed);
    } catch (e) {
      processed[key] = {
        ok: false,
        outputPath: outputWebpPath,
        backgroundColor,
        processedAt: new Date().toISOString(),
        error: e instanceof Error ? e.message : "Erro ao processar.",
      };
      await writeJson(statePath, processed);
    }
  }
}

const program = new Command();

program.name("logo-bg-webp").description("Fila: gerar logo.webp com background usando editor_imagem");

program
  .command("scan")
  .option("--root <path>", "Pasta base", DEFAULT_ROOT_DIR)
  .option("--out <path>", "Arquivo tasks", DEFAULT_TASKS_PATH)
  .action(async (opts) => {
    const tasks = await scanTasks(path.resolve(opts.root));
    await writeJson(path.resolve(opts.out), { rootDir: path.resolve(opts.root), generatedAt: new Date().toISOString(), tasks });
    process.stdout.write(JSON.stringify({ ok: true, count: tasks.length, out: path.resolve(opts.out) }));
  });

program
  .command("process")
  .option("--tasks <path>", "Arquivo tasks", DEFAULT_TASKS_PATH)
  .option("--state <path>", "Arquivo processed", DEFAULT_STATE_PATH)
  .action(async (opts) => {
    await processTasks({ tasksPath: path.resolve(opts.tasks), statePath: path.resolve(opts.state) });
    process.stdout.write(JSON.stringify({ ok: true, state: path.resolve(opts.state) }));
  });

program.parseAsync(process.argv);
