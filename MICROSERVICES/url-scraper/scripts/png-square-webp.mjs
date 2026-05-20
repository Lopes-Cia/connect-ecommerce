import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { Command } from "commander";

const ROOT_DIR = path.resolve(process.cwd());
const DEFAULT_ROOT_DIR = path.join(ROOT_DIR, "data", "assets", "files");
const DEFAULT_TASKS_PATH = path.join(ROOT_DIR, "data", "output", "png-square-tasks.json");
const DEFAULT_STATE_PATH = path.join(ROOT_DIR, "data", "output", "png-square-processed.json");
const EDITOR_CLI = path.resolve(ROOT_DIR, "..", "editor_imagem", "src", "cli.js");

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

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".")) continue;
        stack.push(path.join(dir, entry.name));
        continue;
      }

      if (!entry.isFile()) continue;
      if (entry.name.toLowerCase() === "logo.png") continue;
      if (path.extname(entry.name).toLowerCase() !== ".png") continue;

      const inputPath = path.join(dir, entry.name);
      const outputPath = path.join(dir, `${path.basename(entry.name, ".png")}.webp`);

      tasks.push({ dir, inputPath, outputPath });
    }
  }

  return tasks;
}

function runEditorSquare({ inputPath, outputPath }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [EDITOR_CLI, "square", "--input", inputPath, "--output", outputPath], {
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
    const inputPath = typeof task?.inputPath === "string" ? task.inputPath : null;
    const outputPath = typeof task?.outputPath === "string" ? task.outputPath : null;
    if (!inputPath || !outputPath) continue;

    const key = inputPath;

    try {
      const result = await runEditorSquare({ inputPath, outputPath });
      processed[key] = {
        ok: true,
        outputPath: result.outputPath || outputPath,
        processedAt: new Date().toISOString(),
      };
      await writeJson(statePath, processed);
    } catch (e) {
      processed[key] = {
        ok: false,
        outputPath,
        processedAt: new Date().toISOString(),
        error: e instanceof Error ? e.message : "Erro ao processar.",
      };
      await writeJson(statePath, processed);
    }
  }
}

const program = new Command();

program.name("png-square-webp").description("Fila: criar versão quadrada (1:1) em webp com transparência");

program
  .command("scan")
  .option("--root <path>", "Pasta base", DEFAULT_ROOT_DIR)
  .option("--out <path>", "Arquivo tasks", DEFAULT_TASKS_PATH)
  .action(async (opts) => {
    const rootDir = path.resolve(opts.root);
    const out = path.resolve(opts.out);
    const tasks = await scanTasks(rootDir);
    await writeJson(out, { rootDir, generatedAt: new Date().toISOString(), tasks });
    process.stdout.write(JSON.stringify({ ok: true, count: tasks.length, out }));
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
