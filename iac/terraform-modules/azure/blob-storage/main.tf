resource "random_id" "suffix" {
  byte_length = 4
}

locals {
  account_prefix = substr(replace(lower("${var.project_name}${var.environment}${var.container_name}"), "/[^a-z0-9]/", ""), 0, 16)
}

resource "azurerm_resource_group" "this" {
  name     = "${var.project_name}-${var.environment}-${var.container_name}-rg"
  location = var.location
  tags     = var.common_tags
}

resource "azurerm_storage_account" "this" {
  name                            = "${local.account_prefix}${random_id.suffix.hex}"
  resource_group_name             = azurerm_resource_group.this.name
  location                        = azurerm_resource_group.this.location
  account_kind                    = "StorageV2"
  account_tier                    = "Standard"
  account_replication_type        = var.account_replication_type
  allow_nested_items_to_be_public = var.is_public
  min_tls_version                 = "TLS1_2"
  https_traffic_only_enabled      = true
  tags                            = var.common_tags

  blob_properties {
    versioning_enabled = var.versioning_enabled
  }
}

resource "azurerm_storage_container" "this" {
  name                  = var.container_name
  storage_account_id    = azurerm_storage_account.this.id
  container_access_type = var.is_public ? "blob" : "private"
}
