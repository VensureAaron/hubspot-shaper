import { Command } from "commander";
import { runDiscover } from "./commands/discover";
import { runCompare } from "./commands/compare";
import { runCompareLive } from "./commands/compare-live";
import { runApply } from "./commands/apply";

const program = new Command();

program.name("hubspot-shaper").description("HubSpot schema management tool");

program
  .command("discover")
  .requiredOption("--env <env>", "Environment name")
  .option("--export <mode>", "Export mode: full | split | both")
  .option(
    "--out <file>",
    "Optional filename override (e.g., deals-discovery.json)",
  )
  .action(
    async (options: {
      env: string;
      export?: "full" | "split" | "both";
      out?: string;
    }) => {
      await runDiscover(options.env, {
        exportMode: options.export,
        fileName: options.out,
      });
    },
  );

program
  .command("compare")
  .requiredOption("--from-env <env>", "Source environment (e.g., prod)")
  .requiredOption("--to-env <env>", "Target environment (e.g., dev)")
  .requiredOption("--from <timestamp>", "Source snapshot timestamp")
  .requiredOption("--to <timestamp>", "Target snapshot timestamp")
  .action(
    async (options: {
      fromEnv: string;
      toEnv: string;
      from: string;
      to: string;
    }) => {
      await runCompare({
        fromEnv: options.fromEnv,
        toEnv: options.toEnv,
        from: options.from,
        to: options.to,
      });
    },
  );

program
  .command("compare-live")
  .requiredOption("--from-env <env>", "Source environment (e.g., prod)")
  .requiredOption("--to-env <env>", "Target environment (e.g., dev)")

  .action(async (options: { fromEnv: string; toEnv: string }) => {
    await runCompareLive({
      fromEnv: options.fromEnv,
      toEnv: options.toEnv,
    });
  });
program
  .command("apply")
  .requiredOption("--from-env <env>", "Source environment (e.g., prod)")
  .requiredOption("--to-env <env>", "Target environment (e.g., dev)")
  .option("--dry-run", "Run without making changes")
  .option("--yes", "Skip confirmation prompt")
  .action(
    async (options: {
      fromEnv: string;
      toEnv: string;
      dryRun?: boolean;
      yes?: boolean;
    }) => {
      await runApply({
        fromEnv: options.fromEnv,
        toEnv: options.toEnv,
        dryRun: options.dryRun === true,
        yes: options.yes === true,
      });
    },
  );
program.parse();
