output "storage_account_name" {
  description = "Storage account name including its unique suffix."
  value       = azurerm_storage_account.this.name
}

output "container_name" {
  description = "Blob container name."
  value       = azurerm_storage_container.this.name
}

output "container_url" {
  description = "Blob container HTTPS URL."
  value       = "${azurerm_storage_account.this.primary_blob_endpoint}${azurerm_storage_container.this.name}"
}

output "is_public" {
  description = "Whether anonymous blob reads are enabled."
  value       = var.is_public
}
