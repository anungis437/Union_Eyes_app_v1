DO $$ BEGIN
 CREATE TYPE "public"."role" AS ENUM('super_admin', 'org_admin', 'manager', 'member', 'free_user');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "role" "role" DEFAULT 'member';--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "is_system_admin" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "permissions" text[];