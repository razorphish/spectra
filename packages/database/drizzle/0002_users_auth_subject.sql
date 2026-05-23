ALTER TABLE "spectra"."users" ADD COLUMN "auth_subject" text;--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_subject_uq" ON "spectra"."users" USING btree ("auth_subject");
