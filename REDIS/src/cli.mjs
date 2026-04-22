import "dotenv/config";
import { Command } from "commander";
import { runHealth } from "./commands/health.mjs";
import { runImport } from "./commands/import.mjs";
import { runIndex } from "./commands/index.mjs";
import { runQuery } from "./commands/query.mjs";
import { runClean } from "./commands/clean.mjs";
import { runSync } from "./commands/sync.mjs";

const program = new Command();

program.name("redis-catalogo-mvp").description("CLI para catálogo (Redis Cloud + RedisJSON + RediSearch)").version("1.0.0");

program.command("health").description("Conecta no Redis (TLS) e valida módulos RedisJSON/RediSearch").action(runHealth);

program
  .command("import")
  .description("Importa JSON (brands/categorias/produtos) para chaves catalog:*")
  .option("--dir <path>", "Diretório base dos JSON", "JSON")
  .option("--only <types>", "Tipos separados por vírgula: brands,categorias,produtos", "")
  .option("--batch <n>", "Tamanho do batch/pipeline", "250")
  .action(runImport);

program
  .command("index")
  .description("Cria/garante índice idx:catalog:product (ON JSON, PREFIX)")
  .option("--drop", "Dropa o índice antes de criar (cuidado)", false)
  .action(runIndex);

program
  .command("query")
  .description("Consulta produtos via RediSearch (paginação/busca/filtros/sort)")
  .option("-q, --q <text>", "Texto livre", "")
  .option("--brandId <id>", "Filtrar por brand.id", "")
  .option("--categoryId <id>", "Filtrar por category.id", "")
  .option("--inStock <bool>", "Filtrar por inStock (true/false)", "")
  .option("--priceMin <n>", "Preço mínimo", "")
  .option("--priceMax <n>", "Preço máximo", "")
  .option("--sort <field:dir>", "Sort: price:asc|price:desc|name:asc|name:desc|id:asc|id:desc", "name:asc")
  .option("--page <n>", "Página (1-based)", "1")
  .option("--pageSize <n>", "Itens por página", "20")
  .action(runQuery);

program
  .command("clean")
  .description("Remove somente chaves do namespace do catálogo (prefixo) sem usar FLUSHALL/FLUSHDB")
  .option("--batch <n>", "Tamanho do batch de UNLINK", "500")
  .option("--scanCount <n>", "COUNT do SCAN (controle de throughput)", "2000")
  .action(runClean);

program
  .command("sync")
  .description("Sincroniza catálogo a partir do backend real e atualiza o Redis (upsert + prune)")
  .option("--only <types>", "Tipos separados por vírgula: produtos,categorias,brands", "produtos,categorias,brands")
  .option("--batch <n>", "Tamanho do batch (JSON.SET/UNLINK)", "250")
  .option("--scanCount <n>", "COUNT do SCAN (prune)", "2000")
  .option("--no-prune", "Não remove itens que não existem mais na fonte", false)
  .action(runSync);

program.parseAsync(process.argv);
