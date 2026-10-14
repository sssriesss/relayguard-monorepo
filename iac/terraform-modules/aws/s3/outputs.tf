output "bucket_name" {
  description = "Full bucket name including its unique suffix."
  value       = aws_s3_bucket.this.bucket
}

output "bucket_arn" {
  description = "Bucket ARN."
  value       = aws_s3_bucket.this.arn
}

output "is_public" {
  description = "Whether anonymous object reads are enabled."
  value       = var.is_public
}
