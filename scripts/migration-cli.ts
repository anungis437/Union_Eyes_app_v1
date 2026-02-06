#!/usr/bin/env node

/**
 * Migration CLI Tool
 * 
 * Command-line interface for managing tenant-to-organization migrations.
 * 
 * Usage:
 *   node scripts/migration-cli.js <command> [options]
 * 
 * Commands:
 *   validate          Run pre-migration validation checks
 *   migrate           Migrate data from tenant_id to organization_id
 *   rollback          Rollback a migration
 *   status            Check migration status
 *   backup            Create database backups
 *   verify            Verify migration integrity
 * 
 * @module scripts/migration-cli
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {
  runPreMigrationValidation,
  runPostMigrationValidation,
  exportReport,
} from "../lib/migrations/data-integrity";
import {
  migrateAllTables,
  migrateTenant,
  migrateTable,
  getMigrationProgress,
} from "../lib/migrations/batch-migration";
import {
  createAllBackups,
  listBackups,
  cleanupBackups,
  rollbackAllTables,
  rollbackTenant,
  rollbackTable,
  emergencyRollback,
  verifyAllRollbacks,
} from "../lib/migrations/rollback";
import {
  getMigrationStats,
  getAllMappings,
  refreshCache,
  clearCache,
} from "../lib/migrations/tenant-to-org-mapper";

const program = new Command();

program
  .name("migration-cli")
  .description("CLI tool for tenant-to-organization migrations")
  .version("1.0.0");

// =====================================================
// Validate Command
// =====================================================

program
  .command("validate")
  .description("Run pre-migration validation checks")
  .option("--export <path>", "Export report to JSON file")
  .action(async (options) => {
    console.log(chalk.blue.bold("\n🔍 Running Pre-Migration Validation\n"));

    const spinner = ora("Validating data integrity...").start();

    try {
      const report = await runPreMigrationValidation();

      spinner.stop();

      if (options.export) {
        await exportReport(report, options.export);
      }

      if (report.status === "pass") {
        console.log(chalk.green.bold("\n✅ Validation PASSED - Ready to migrate\n"));
        process.exit(0);
      } else if (report.status === "warning") {
        console.log(chalk.yellow.bold("\n⚠️  Validation PASSED with warnings\n"));
        process.exit(0);
      } else {
        console.log(chalk.red.bold("\n❌ Validation FAILED - Fix issues before migrating\n"));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red("Validation failed"));
      console.error(error);
      process.exit(1);
    }
  });

// =====================================================
// Migrate Command
// =====================================================

program
  .command("migrate")
  .description("Migrate data from tenant_id to organization_id")
  .option("--tenant <id>", "Migrate specific tenant only")
  .option("--table <name>", "Migrate specific table only")
  .option("--dry-run", "Run migration without making changes")
  .option("--skip-backup", "Skip automatic backup creation")
  .option("--skip-validation", "Skip pre-migration validation")
  .action(async (options) => {
    console.log(chalk.blue.bold("\n🚀 Starting Migration\n"));

    try {
      // Step 1: Pre-migration validation (unless skipped)
      if (!options.skipValidation) {
        const spinner = ora("Running pre-migration validation...").start();
        const report = await runPreMigrationValidation();
        spinner.stop();

        if (report.status === "fail") {
          console.log(
            chalk.red.bold(
              "\n❌ Validation failed - fix issues before migrating\n"
            )
          );
          process.exit(1);
        }
      }

      // Step 2: Create backups (unless skipped or dry-run)
      if (!options.skipBackup && !options.dryRun) {
        const spinner = ora("Creating backups...").start();
        await createAllBackups();
        spinner.succeed(chalk.green("Backups created"));
      }

      // Step 3: Run migration
      if (options.tenant) {
        // Migrate specific tenant
        const spinner = ora(
          `Migrating tenant: ${options.tenant} ${options.dryRun ? "(DRY RUN)" : ""}`
        ).start();

        const results = await migrateTenant(options.tenant, options.dryRun);

        spinner.succeed(
          chalk.green(
            `Tenant migration ${options.dryRun ? "validated" : "completed"}`
          )
        );

        let totalMigrated = 0;
        results.forEach((result) => {
          totalMigrated += result.migratedRows;
        });

        console.log(chalk.green(`\n✅ Migrated ${totalMigrated} records\n`));
      } else if (options.table) {
        // Migrate specific table
        const spinner = ora(
          `Migrating table: ${options.table} ${options.dryRun ? "(DRY RUN)" : ""}`
        ).start();

        const tableConfig = {
          tableName: options.table,
          tenantIdColumn: "tenant_id",
          organizationIdColumn: "organization_id",
          batchSize: 500,
          dependencies: [],
        };

        const result = await migrateTable(tableConfig, options.dryRun);

        spinner.succeed(
          chalk.green(
            `Table migration ${options.dryRun ? "validated" : "completed"}`
          )
        );

        console.log(
          chalk.green(
            `\n✅ Migrated ${result.migratedRows}/${result.totalRows} records\n`
          )
        );

        if (result.failedRows > 0) {
          console.log(chalk.yellow(`⚠️  ${result.failedRows} rows failed\n`));
        }
      } else {
        // Migrate all tables
        console.log(
          chalk.cyan(
            `Mode: ${options.dryRun ? "DRY RUN" : "LIVE MIGRATION"}\n`
          )
        );

        const results = await migrateAllTables(options.dryRun, (table, progress) => {
          console.log(
            chalk.cyan(`   ${table}: ${progress.toFixed(1)}% complete`)
          );
        });

        let totalMigrated = 0;
        let totalFailed = 0;

        results.forEach((result) => {
          totalMigrated += result.migratedRows;
          totalFailed += result.failedRows;
        });

        if (totalFailed === 0) {
          console.log(
            chalk.green.bold(
              `\n✅ Migration ${options.dryRun ? "validated" : "completed"} successfully!\n`
            )
          );
          console.log(chalk.green(`   Total records migrated: ${totalMigrated}\n`));
        } else {
          console.log(
            chalk.yellow.bold(
              `\n⚠️  Migration ${options.dryRun ? "validated" : "completed"} with errors\n`
            )
          );
          console.log(chalk.green(`   Successfully migrated: ${totalMigrated}`));
          console.log(chalk.red(`   Failed: ${totalFailed}\n`));
        }
      }

      // Step 4: Post-migration validation (unless dry-run)
      if (!options.dryRun) {
        const spinner = ora("Running post-migration validation...").start();
        const report = await runPostMigrationValidation();
        spinner.stop();

        if (report.status === "pass") {
          console.log(
            chalk.green.bold("\n✅ Post-migration validation PASSED\n")
          );
        } else {
          console.log(
            chalk.yellow.bold(
              "\n⚠️  Post-migration validation found issues - review report\n"
            )
          );
        }
      }

      process.exit(0);
    } catch (error) {
      console.log(chalk.red.bold("\n❌ Migration failed\n"));
      console.error(error);
      process.exit(1);
    }
  });

// =====================================================
// Rollback Command
// =====================================================

program
  .command("rollback")
  .description("Rollback a migration")
  .option("--tenant <id>", "Rollback specific tenant only")
  .option("--table <name>", "Rollback specific table only")
  .option("--all", "Rollback all tables")
  .option("--emergency", "Emergency rollback (stops all migrations)")
  .option("--verify", "Verify rollback after completion")
  .action(async (options) => {
    console.log(chalk.yellow.bold("\n🔄 Starting Rollback\n"));

    // Confirm rollback
    if (!options.emergency) {
      console.log(
        chalk.yellow("⚠️  This will revert migrated data. Are you sure?")
      );
      console.log(chalk.yellow("   Press Ctrl+C to cancel, or wait 5 seconds...\n"));
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    try {
      if (options.emergency) {
        const spinner = ora("Running emergency rollback...").start();
        const result = await emergencyRollback();
        spinner.stop();

        if (result.success) {
          console.log(chalk.green.bold("\n✅ Emergency rollback completed\n"));
          console.log(chalk.green(`   Tables rolled back: ${result.tablesRolledBack}\n`));
        } else {
          console.log(chalk.red.bold("\n❌ Emergency rollback failed\n"));
          result.errors.forEach((err) => console.log(chalk.red(`   ${err}`)));
        }
      } else if (options.tenant) {
        const spinner = ora(`Rolling back tenant: ${options.tenant}...`).start();
        const success = await rollbackTenant(options.tenant);
        spinner.stop();

        if (success) {
          console.log(chalk.green.bold("\n✅ Tenant rollback completed\n"));
        } else {
          console.log(chalk.red.bold("\n❌ Tenant rollback failed\n"));
        }
      } else if (options.table) {
        const spinner = ora(`Rolling back table: ${options.table}...`).start();
        const result = await rollbackTable(options.table);
        spinner.stop();

        if (result.status === "completed") {
          console.log(chalk.green.bold("\n✅ Table rollback completed\n"));
          console.log(chalk.green(`   Rows restored: ${result.rowsRestored}\n`));
        } else {
          console.log(chalk.red.bold("\n❌ Table rollback failed\n"));
        }
      } else if (options.all) {
        const spinner = ora("Rolling back all tables...").start();
        const results = await rollbackAllTables();
        spinner.stop();

        let totalRestored = 0;
        results.forEach((result) => {
          totalRestored += result.rowsRestored;
        });

        console.log(chalk.green.bold("\n✅ Rollback completed\n"));
        console.log(chalk.green(`   Total rows restored: ${totalRestored}\n`));
      } else {
        console.log(chalk.red("Error: Please specify --tenant, --table, --all, or --emergency\n"));
        process.exit(1);
      }

      // Verify rollback if requested
      if (options.verify) {
        const spinner = ora("Verifying rollback...").start();
        const results = await verifyAllRollbacks();
        spinner.stop();

        const allSuccess = Array.from(results.values()).every((r) => r.success);

        if (allSuccess) {
          console.log(chalk.green.bold("✅ Rollback verification PASSED\n"));
        } else {
          console.log(chalk.yellow.bold("⚠️  Rollback verification found issues\n"));
        }
      }

      process.exit(0);
    } catch (error) {
      console.log(chalk.red.bold("\n❌ Rollback failed\n"));
      console.error(error);
      process.exit(1);
    }
  });

// =====================================================
// Status Command
// =====================================================

program
  .command("status")
  .description("Check migration status")
  .option("--detailed", "Show detailed table-by-table status")
  .action(async (options) => {
    console.log(chalk.blue.bold("\n📊 Migration Status\n"));

    try {
      // Get overall stats
      const stats = await getMigrationStats();

      console.log(chalk.cyan("Overall Statistics:"));
      console.log(`   Total mappings: ${stats.total}`);
      console.log(`   Pending: ${chalk.yellow(stats.pending)}`);
      console.log(`   In Progress: ${chalk.cyan(stats.inProgress)}`);
      console.log(`   Completed: ${chalk.green(stats.completed)}`);
      console.log(`   Failed: ${chalk.red(stats.failed)}`);
      console.log(`   Rolled Back: ${chalk.yellow(stats.rolledBack)}`);
      console.log(`   Total Records: ${stats.totalRecords}\n`);

      if (options.detailed) {
        // Get table-by-table progress
        const progress = await getMigrationProgress();

        console.log(chalk.cyan("Table Progress:\n"));

        progress.tables.forEach((table) => {
          const bar = createProgressBar(table.percentage, 30);
          const color =
            table.percentage === 100
              ? chalk.green
              : table.percentage > 0
              ? chalk.yellow
              : chalk.gray;

          console.log(
            `   ${table.tableName.padEnd(30)} ${bar} ${color(
              table.percentage.toFixed(1) + "%"
            )} (${table.migrated}/${table.total})`
          );
        });

        console.log();
        const overallBar = createProgressBar(progress.overall.percentage, 30);
        const overallColor =
          progress.overall.percentage === 100
            ? chalk.green
            : progress.overall.percentage > 0
            ? chalk.yellow
            : chalk.gray;

        console.log(
          chalk.bold(
            `   ${"OVERALL".padEnd(30)} ${overallBar} ${overallColor(
              progress.overall.percentage.toFixed(1) + "%"
            )} (${progress.overall.migrated}/${progress.overall.total})`
          )
        );
        console.log();
      }

      process.exit(0);
    } catch (error) {
      console.log(chalk.red.bold("\n❌ Failed to get status\n"));
      console.error(error);
      process.exit(1);
    }
  });

// =====================================================
// Backup Command
// =====================================================

program
  .command("backup")
  .description("Manage database backups")
  .option("--create", "Create new backups")
  .option("--list", "List existing backups")
  .option("--cleanup [days]", "Delete backups older than X days (default: 7)")
  .action(async (options) => {
    try {
      if (options.create) {
        console.log(chalk.blue.bold("\n📦 Creating Backups\n"));
        const spinner = ora("Creating backups...").start();
        const backups = await createAllBackups();
        spinner.succeed(chalk.green(`Created ${backups.size} backups`));
      } else if (options.list) {
        console.log(chalk.blue.bold("\n📦 Existing Backups\n"));
        const backups = await listBackups();

        if (backups.length === 0) {
          console.log(chalk.gray("   No backups found\n"));
        } else {
          backups.forEach((backup) => {
            console.log(chalk.cyan(`   ${backup.backupTableName}`));
            console.log(`      Original: ${backup.tableName}`);
            console.log(`      Rows: ${backup.rowCount}`);
            console.log(`      Created: ${backup.createdAt.toISOString()}`);
            console.log();
          });
        }
      } else if (options.cleanup) {
        const days = typeof options.cleanup === "number" ? options.cleanup : 7;
        console.log(
          chalk.blue.bold(`\n🗑️  Cleaning up backups older than ${days} days\n`)
        );
        const spinner = ora("Deleting old backups...").start();
        const deleted = await cleanupBackups(days);
        spinner.succeed(chalk.green(`Deleted ${deleted} old backups`));
      } else {
        console.log(
          chalk.red("Error: Please specify --create, --list, or --cleanup\n")
        );
        process.exit(1);
      }

      process.exit(0);
    } catch (error) {
      console.log(chalk.red.bold("\n❌ Backup operation failed\n"));
      console.error(error);
      process.exit(1);
    }
  });

// =====================================================
// Verify Command
// =====================================================

program
  .command("verify")
  .description("Verify migration integrity")
  .option("--pre", "Run pre-migration validation")
  .option("--post", "Run post-migration validation")
  .option("--export <path>", "Export report to JSON file")
  .action(async (options) => {
    try {
      if (options.pre) {
        console.log(chalk.blue.bold("\n🔍 Pre-Migration Validation\n"));
        const spinner = ora("Validating...").start();
        const report = await runPreMigrationValidation();
        spinner.stop();

        if (options.export) {
          await exportReport(report, options.export);
        }
      } else if (options.post) {
        console.log(chalk.blue.bold("\n🔍 Post-Migration Validation\n"));
        const spinner = ora("Validating...").start();
        const report = await runPostMigrationValidation();
        spinner.stop();

        if (options.export) {
          await exportReport(report, options.export);
        }
      } else {
        console.log(chalk.red("Error: Please specify --pre or --post\n"));
        process.exit(1);
      }

      process.exit(0);
    } catch (error) {
      console.log(chalk.red.bold("\n❌ Verification failed\n"));
      console.error(error);
      process.exit(1);
    }
  });

// =====================================================
// Cache Command
// =====================================================

program
  .command("cache")
  .description("Manage mapping cache")
  .option("--refresh", "Refresh the cache")
  .option("--clear", "Clear the cache")
  .action(async (options) => {
    try {
      if (options.refresh) {
        console.log(chalk.blue.bold("\n🔄 Refreshing Cache\n"));
        const spinner = ora("Refreshing cache...").start();
        await refreshCache();
        spinner.succeed(chalk.green("Cache refreshed"));
      } else if (options.clear) {
        console.log(chalk.blue.bold("\n🗑️  Clearing Cache\n"));
        clearCache();
        console.log(chalk.green("✅ Cache cleared\n"));
      } else {
        console.log(chalk.red("Error: Please specify --refresh or --clear\n"));
        process.exit(1);
      }

      process.exit(0);
    } catch (error) {
      console.log(chalk.red.bold("\n❌ Cache operation failed\n"));
      console.error(error);
      process.exit(1);
    }
  });

// =====================================================
// Helper Functions
// =====================================================

function createProgressBar(percentage: number, width: number): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(empty));
}

// Parse arguments and execute
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
