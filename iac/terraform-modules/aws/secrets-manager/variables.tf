variable "secret_name" {
  type = string
}
variable "description" {
  type = string
}
variable "recovery_window_in_days" {
  type    = number
  default = 7
}
variable "secret_string" {
  type        = string
  description = "Optional initial secret version. Keep null when values are delivered out of band."
  default     = null
  sensitive   = true
}
variable "common_tags" {
  type    = map(string)
  default = {}
}
