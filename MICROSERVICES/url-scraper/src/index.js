import "dotenv/config";
import { Command } from "commander";
import { buildMarcasJson, processMarcasStage2, processMarcasStage3 } from "./interpreters/marcas-de-mercado.js";
import { processFila } from "./controller/fila.js";

const program = new Command();
program.name("url-scraper").description("MVP url-scraper").version("0.1.0");

program
  .command("marcas")
  .option("--url <url>", "Home (lista de marcas)", "https://www.catalogoambev.com.br/site")
  .option("--out <path>", "Output JSON", "data/output/marcas.json")
  .option("--timeout-ms <ms>", "Timeout navegação", (v) => Number(v), 15000)
  .option("--show", "Abrir navegador (headless=false)", false)
  .option("--slow-ms <ms>", "Delay entre ações (modo visual)", (v) => Number(v), 0)
  .action(async (opts) => {
    try {
      const log = (msg) => process.stderr.write(String(msg || "") + "\n");
      const payload = await buildMarcasJson({
        url: opts.url,
        outPath: opts.out,
        timeoutMs: opts.timeoutMs,
        headless: !opts.show,
        slowMo: Number.isFinite(opts.slowMs) ? opts.slowMs : 0,
        log
      });
      process.stdout.write(
        JSON.stringify({ ok: true, count: payload["Marcas de Mercado"]?.length || 0, out: opts.out }) + "\n"
      );
    } catch (err) {
      process.exitCode = 1;
      process.stdout.write(JSON.stringify({ ok: false, error: String(err?.message || err) }) + "\n");
    }
  });

program
  .command("marcas-2")
  .option("--in <path>", "Input JSON", "data/output/marcas.json")
  .option("--assets-dir <path>", "Pasta base para salvar assets", "data/assets/files")
  .action(async (opts) => {
    try {
      const log = (msg) => process.stderr.write(String(msg || "") + "\n");
      const result = await processMarcasStage2({
        marcasPath: opts.in,
        assetsDir: opts.assetsDir,
        log
      });
      process.stdout.write(
        JSON.stringify({
          ok: result.errors.length === 0,
          total: result.total,
          processed: result.processed,
          errors: result.errors
        }) + "\n"
      );
    } catch (err) {
      process.exitCode = 1;
      process.stdout.write(JSON.stringify({ ok: false, error: String(err?.message || err) }) + "\n");
    }
  });

program
  .command("marcas-3")
  .option("--in <path>", "Input JSON", "data/output/marcas.json")
  .option("--assets-dir <path>", "Pasta base para salvar assets", "data/assets/files")
  .option("--fila-out <path>", "Output fila.json", "data/output/fila.json")
  .action(async (opts) => {
    try {
      const log = (msg) => process.stderr.write(String(msg || "") + "\n");
      const result = await processMarcasStage3({
        marcasPath: opts.in,
        assetsDir: opts.assetsDir,
        filaPath: opts.filaOut,
        log
      });
      process.stdout.write(
        JSON.stringify({
          ok: result.errors.length === 0,
          total: result.total,
          processed: result.processed,
          errors: result.errors,
          fila: result.filaPath
        }) + "\n"
      );
    } catch (err) {
      process.exitCode = 1;
      process.stdout.write(JSON.stringify({ ok: false, error: String(err?.message || err) }) + "\n");
    }
  });

program
  .command("fila-1")
  .option("--fila <path>", "Input fila.json", "data/output/fila.json")
  .option("--timeout-ms <ms>", "Timeout navegação", (v) => Number(v), 15000)
  .option("--show", "Abrir navegador (headless=false)", false)
  .option("--slow-ms <ms>", "Delay entre ações (modo visual)", (v) => Number(v), 0)
  .action(async (opts) => {
    try {
      const log = (msg) => process.stderr.write(String(msg || "") + "\n");
      const result = await processFila({
        filaPath: opts.fila,
        timeoutMs: opts.timeoutMs,
        headless: !opts.show,
        slowMo: Number.isFinite(opts.slowMs) ? opts.slowMs : 0,
        log
      });
      process.stdout.write(
        JSON.stringify({
          ok: true,
          total: result.total,
          processed: result.processed,
          fila: result.filaPath
        }) + "\n"
      );
    } catch (err) {
      process.exitCode = 1;
      process.stdout.write(JSON.stringify({ ok: false, error: String(err?.message || err) }) + "\n");
    }
  });

program.parseAsync(process.argv);
