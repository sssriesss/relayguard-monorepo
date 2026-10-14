variable "project_name" {
  description = "Project prefix for resource names."
  type        = string
}

variable "environment" {
  description = "Environment prefix for resource names."
  type        = string
}

variable "location" {
  description = "Cloud location inherited from the environment."
  type        = string
}

variable "common_tags" {
  description = "Environment-wide tags or labels."
  type        = map(string)
  default     = {}
}

variable "is_public" {
  description = "Allow anonymous object reads."
  type        = bool
  default     = false
}

variable "versioning_enabled" {
  description = "Enable object versioning."
  type        = bool
  default     = true
}

variable "container_name" {
  description = "Blob container name, also used to identify its account and resource group."
  type        = string
}

variable "account_replication_type" {
  description = "Storage account replication type."
  type        = string
  default     = "LRS"
}
