variable "topic_name" {
  type = string
}
variable "common_tags" {
  type    = map(string)
  default = {}
}
variable "kms_master_key_id" {
  type    = string
  default = "alias/aws/sns"
}
variable "email_endpoint" {
  type    = string
  default = null
}
