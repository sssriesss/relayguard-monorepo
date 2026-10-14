variable "queue_name" {
  type = string
}
variable "common_tags" {
  type    = map(string)
  default = {}
}
variable "visibility_timeout_seconds" {
  type    = number
  default = 30
}
variable "message_retention_seconds" {
  type    = number
  default = 345600
}
variable "receive_wait_time_seconds" {
  type    = number
  default = 0
}
variable "dead_letter_target_arn" {
  type    = string
  default = null
}
variable "max_receive_count" {
  type    = number
  default = 5
}
