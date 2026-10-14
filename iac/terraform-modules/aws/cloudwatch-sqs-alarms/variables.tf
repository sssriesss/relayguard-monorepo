variable "alarm_topic_arn" {
  type = string
}

variable "queue_alarms" {
  type = map(object({
    queue_name      = string
    description     = string
    max_age_seconds = optional(number)
  }))
}

variable "common_tags" {
  type    = map(string)
  default = {}
}
