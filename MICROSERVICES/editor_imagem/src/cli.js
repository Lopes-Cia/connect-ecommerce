import { Command } from "commander";
import { bgToWebp } from "./bg-webp.js";
import { toSquareTransparent } from "./square.js";

const program = new Command();

program.name("editor_imagem").description("Editor de imagem").version("0.1.0");

program
  .command("bg-webp")
  .requiredOption("--input <path>")
  .requiredOption("--bg <color>")
  .requiredOption("--output <path>")
  .action(async (opts) => {
    try {
      const result = await bgToWebp({
        inputPngPath: opts.input,
        backgroundColor: opts.bg,
        outputWebpPath: opts.output,
      });
      process.stdout.write(JSON.stringify({ ok: true, ...result }));
    } catch (e) {
      process.stdout.write(
        JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Erro ao processar imagem." })
      );
      process.exitCode = 1;
    }
  });

program
  .command("square")
  .requiredOption("--input <path>")
  .requiredOption("--output <path>")
  .action(async (opts) => {
    try {
      const result = await toSquareTransparent({
        inputPath: opts.input,
        outputPath: opts.output,
      });
      process.stdout.write(JSON.stringify({ ok: true, ...result }));
    } catch (e) {
      process.stdout.write(
        JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Erro ao processar imagem." })
      );
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
