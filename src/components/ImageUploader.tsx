import { useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS, apiUpload, UploadResponse } from '@/lib/api';

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  currentImageUrl?: string;
  label?: string;
}

export function ImageUploader({ onUploadComplete, currentImageUrl, label = 'Upload Image' }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (JPEG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Create preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to backend
    setUploading(true);
    try {
      // Create FormData instead of converting to base64
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiUpload<UploadResponse>(API_ENDPOINTS.UPLOAD_IMAGE, formData);

      const data = await response;

      if (data.success && data.data?.url) {
        // Update preview with actual uploaded image URL
        setPreview(data.data.url);
        onUploadComplete(data.data.url);
        toast({
          title: 'Upload successful',
          description: 'Image uploaded successfully',
        });
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
      // Remove preview if upload failed
      setPreview(null);
      onUploadComplete('');
    } finally {
      setUploading(false);
      // Clear the file input
      e.target.value = '';
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUploadComplete('');
    toast({
      title: 'Image removed',
      description: 'Image has been removed',
    });
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {preview ? (
        <Card className="relative">
          <CardContent className="p-4">
            <div className="relative inline-block">
              <img
                src={preview}
                alt="Preview"
                className="h-32 w-32 object-cover rounded-lg"
                onError={() => {
                  // Handle broken image
                  setPreview(null);
                  onUploadComplete('');
                  toast({
                    title: 'Image Error',
                    description: 'Failed to load image',
                    variant: 'destructive',
                  });
                }}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {preview.startsWith('http') && (
              <p className="text-xs text-muted-foreground mt-2 truncate">
                URL: {preview.substring(0, 30)}...
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <label
              htmlFor="image-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload or drag and drop</span>
                  <span className="text-xs text-muted-foreground mt-1">JPEG, PNG up to 5MB</span>
                </>
              )}
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </label>
          </CardContent>
        </Card>
      )}
    </div>
  );
}