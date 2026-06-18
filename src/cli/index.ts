import { Command } from "commander"
import { runDiscover } from "./commands/discover"

const program = new Command()

program
  .name("hubspot-shaper")
  .description("HubSpot schema management tool")

program
  .command("discover")
  .requiredOption("--env <env>", "Environment name")
  .option("--out <file>", "Write full discovery output to a JSON file")
  .action(async (options: { env: string; out?: string }) => {
    await runDiscover(options.env, options.out)
  })

program.parse()