-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'teacher',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "min_stock" INTEGER NOT NULL,
    "price" REAL,
    "location" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requester_id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "needed_date" DATETIME NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" DATETIME,
    "decided_by" TEXT,
    "reject_reason" TEXT,
    CONSTRAINT "requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "requests_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "request_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "request_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "requested_qty" INTEGER NOT NULL,
    "allocated_qty" INTEGER NOT NULL,
    "shortfall_qty" INTEGER NOT NULL,
    CONSTRAINT "request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "request_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "purchase_proposals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "item_id" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "source_request_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'can_mua',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_qty" INTEGER NOT NULL DEFAULT 0,
    "resolved_at" DATETIME,
    CONSTRAINT "purchase_proposals_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchase_proposals_source_request_id_fkey" FOREIGN KEY ("source_request_id") REFERENCES "requests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "item_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity_change" INTEGER NOT NULL,
    "reference_id" TEXT,
    "performed_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    CONSTRAINT "stock_transactions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_transactions_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
