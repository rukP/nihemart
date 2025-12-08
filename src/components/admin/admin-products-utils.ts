export function getProductErrorMessage(error: any, isEditMode: boolean): string {
    let errorMessage = `Failed to ${isEditMode ? 'update' : 'create'} product.`;
    if (error.code) {
        switch (error.code) {
            case '23505':
                if (error.message?.includes('products_sku_key')) {
                    errorMessage = 'Product SKU already exists. Please choose a different SKU.';
                } else if (error.message?.includes('product_variations_sku_key')) {
                    errorMessage = 'Variation SKU already exists. Please choose a different SKU for the variation.';
                } else {
                    errorMessage = 'Duplicate value error. Please check for unique fields.';
                }
                break;
            case '23503':
                errorMessage = 'Invalid reference. Please check category or subcategory.';
                break;
            case 'NoSuchBucket':
                errorMessage = 'Storage bucket does not exist. Contact support.';
                break;
            case 'InvalidJWT':
                errorMessage = 'Authentication error. Please log in again.';
                break;
            case 'InvalidRequest':
                errorMessage = 'Invalid request. Please check the data and try again.';
                break;
            case 'EntityTooLarge':
                errorMessage = 'File too large. Please reduce file size.';
                break;
            case 'InternalError':
                errorMessage = 'Internal server error. Please try again later.';
                break;
            case 'ResourceAlreadyExists':
                errorMessage = 'Resource already exists. Use upsert or choose different name.';
                break;
            case 'InvalidBucketName':
                errorMessage = 'Invalid bucket name.';
                break;
            case 'InvalidKey':
                errorMessage = 'Invalid file key.';
                break;
            case 'InvalidRange':
                errorMessage = 'Invalid range for file.';
                break;
            case 'InvalidMimeType':
                errorMessage = 'Invalid file type.';
                break;
            case 'InvalidUploadId':
                errorMessage = 'Invalid upload ID.';
                break;
            case 'KeyAlreadyExists':
                errorMessage = 'File key already exists.';
                break;
            case 'BucketAlreadyExists':
                errorMessage = 'Bucket already exists.';
                break;
            case 'DatabaseTimeout':
                errorMessage = 'Database timeout. Please try again.';
                break;
            case 'InvalidSignature':
                errorMessage = 'Invalid signature. Check credentials.';
                break;
            case 'SignatureDoesNotMatch':
                errorMessage = 'Signature mismatch. Check credentials.';
                break;
            case 'AccessDenied':
                errorMessage = 'Access denied. Check permissions.';
                break;
            case 'ResourceLocked':
                errorMessage = 'Resource locked. Try again later.';
                break;
            case 'DatabaseError':
                errorMessage = 'Database error. Please try again.';
                break;
            case 'MissingContentLength':
                errorMessage = 'Missing content length.';
                break;
            case 'MissingParameter':
                errorMessage = 'Missing required parameter.';
                break;
            case 'InvalidUploadSignature':
                errorMessage = 'Invalid upload signature.';
                break;
            case 'LockTimeout':
                errorMessage = 'Lock timeout. Try again.';
                break;
            case 'S3Error':
                errorMessage = 'S3 error. Contact support.';
                break;
            case 'S3InvalidAccessKeyId':
                errorMessage = 'Invalid access key.';
                break;
            case 'S3MaximumCredentialsLimit':
                errorMessage = 'Credentials limit reached.';
                break;
            case 'InvalidChecksum':
                errorMessage = 'Invalid checksum.';
                break;
            case 'MissingPart':
                errorMessage = 'Missing part of file.';
                break;
            case 'SlowDown':
                errorMessage = 'Too many requests. Slow down.';
                break;
            default:
                errorMessage = error.message || errorMessage;
        }
    }
    return errorMessage;
}