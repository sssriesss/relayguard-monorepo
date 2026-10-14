variable "bus_name" {
  type = string
}
variable "archive_retention_days" {
  type    = number
  default = null
}
variable "common_tags" {
  type    = map(string)
  default = {}
}
