import { sqliteTable, text, integer, index, primaryKey, uniqueIndex } from "drizzle-orm/sqlite-core";
export const designs = sqliteTable("designs", {
    id: text("id").primaryKey(), owner: text("owner").notNull(), name: text("name").notNull(), kind: text("kind").notNull(), stage: text("stage").notNull().default("brief"), body: text("body").notNull(), version: integer("version").notNull().default(1), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(), archived: integer("archived", { mode: "boolean" }).notNull().default(false),
}, t => [index("design_owner_idx").on(t.owner, t.archived)]);
export const assets = sqliteTable("assets", {
    id: text("id").primaryKey(), owner: text("owner").notNull(), designId: text("design_id").notNull().references(() => designs.id), objectKey: text("object_key").notNull(), name: text("name").notNull(), mime: text("mime").notNull(), size: integer("size").notNull(), width: integer("width").notNull().default(0), height: integer("height").notNull().default(0), createdAt: text("created_at").notNull(),
}, t => [index("asset_owner_idx").on(t.owner, t.designId)]);
export const research = sqliteTable("research", {
    id: text("id").primaryKey(), owner: text("owner").notNull(), kind: text("kind").notNull(), query: text("query").notNull(), body: text("body").notNull(), fetchedAt: text("fetched_at").notNull(),
}, t => [index("research_owner_idx").on(t.owner, t.fetchedAt)]);
export const rateLimits = sqliteTable("rate_limits", { owner: text("owner").notNull(), window: text("window").notNull(), count: integer("count").notNull() }, t => [primaryKey({ columns: [t.owner, t.window] })]);
export const productionJobs=sqliteTable("production_jobs",{
 id:text("id").primaryKey(),owner:text("owner").notNull(),requestId:text("request_id").notNull(),
 input:text("input").notNull(),output:text("output").notNull().default("{}"),
 status:text("status").notNull().default("queued"),step:text("step").notNull().default("plan"),
 designId:text("design_id"),error:text("error"),leaseToken:text("lease_token"),leaseUntil:integer("lease_until").notNull().default(0),
 startedStep:text("started_step"),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull(),
},t=>[index("production_owner_idx").on(t.owner,t.createdAt),uniqueIndex("production_request_idx").on(t.owner,t.requestId)]);
