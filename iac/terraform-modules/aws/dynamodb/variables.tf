variable "table_name" {
  type = string
}
variable "common_tags" {
  type    = map(string)
  default = {}
}
variable "attributes" {
  type = list(object({ name = string, type = string }))
}
variable "hash_key" {
  type = string
}

variable "range_key" {
  type    = string
  default = null
}
variable "global_secondary_indexes" {
  type = list(object({
    name            = string
    projection_type = string
    hash_key        = string
    range_key       = optional(string)
  }))
  default = []
}
variable "stream_enabled" {
  type    = bool
  default = false
}
variable "stream_view_type" {
  type    = string
  default = "NEW_IMAGE"
}
variable "ttl_enabled" {
  type    = bool
  default = false
}
variable "ttl_attribute_name" {
  type    = string
  default = "expires_at"
}
variable "point_in_time_recovery_enabled" {
  type    = bool
  default = true
}
