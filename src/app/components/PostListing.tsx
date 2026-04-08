import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Plus, X, Loader2, FileText, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { categories, locations, healthStatuses, durations } from "../data/mockData";
import { useCreateListing, useUploadImage, useLivestockItem, useUpdateListing } from "../../hooks/useLivestock";
import { useAuthStore } from "../../stores/authStore";
import { isSupabaseConfigured } from "../../lib/supabase";
import { toast } from "sonner";

export function PostListing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit') || undefined;
  const isEditMode = !!editId;

  const user = useAuthStore((s) => s.user);
  const createListing = useCreateListing();
  const updateListing = useUpdateListing();
  const uploadImage = useUploadImage();
  const { data: existingItem, isLoading: loadingItem } = useLivestockItem(editId);

  const hasBids = useMemo(() => {
    if (!existingItem) return false;
    return (existingItem.bid_count ?? existingItem.bidCount ?? 0) > 0;
  }, [existingItem]);

  const blobUrlsRef = useRef<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [stockCardFile, setStockCardFile] = useState<File | null>(null);
  const [stockCardPreview, setStockCardPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    breed: '',
    age: '',
    weight: '',
    description: '',
    location: '',
    health: '',
    startingPrice: '',
    duration: '',
  });
  const [prefilled, setPrefilled] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (isEditMode && existingItem && !prefilled) {
      setFormData({
        title: existingItem.title || '',
        category: existingItem.category || '',
        breed: existingItem.breed || '',
        age: existingItem.age || '',
        weight: existingItem.weight || '',
        description: existingItem.description || '',
        location: existingItem.location || '',
        health: existingItem.health || '',
        startingPrice: String(existingItem.starting_price ?? existingItem.startingPrice ?? ''),
        duration: '',
      });
      const existingPhotos = existingItem.image_urls ?? existingItem.imageUrls ?? [];
      setPhotos(existingPhotos);
      setPhotoFiles([]);
      setPrefilled(true);
    }
  }, [isEditMode, existingItem, prefilled]);

  const handlePhotoAdd = () => {
    if (photos.length >= 4) return;

    if (isSupabaseConfigured) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          setPhotoFiles(prev => [...prev, file]);
          const blobUrl = URL.createObjectURL(file);
          blobUrlsRef.current = [...blobUrlsRef.current, blobUrl];
          setPhotos(prev => [...prev, blobUrl]);
        }
      };
      input.click();
    } else {
      setPhotos([...photos, `https://via.placeholder.com/200?text=Photo+${photos.length + 1}`]);
    }
  };

  const handlePhotoRemove = (index: number) => {
    const removedUrl = photos[index];
    if (removedUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(removedUrl);
      blobUrlsRef.current = blobUrlsRef.current.filter(u => u !== removedUrl);
    }
    // Only remove from photoFiles if the removed photo is a new file (blob URL).
    // photoFiles only tracks new files, so we must compute the correct index
    // within photoFiles by counting how many blob URLs appear before this index.
    setPhotos(photos.filter((_, i) => i !== index));
    if (removedUrl?.startsWith('blob:')) {
      const blobIndexesBefore = photos.slice(0, index).filter(url => url.startsWith('blob:')).length;
      setPhotoFiles(photoFiles.filter((_, i) => i !== blobIndexesBefore));
    }
  };

  // Revoke all object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      if (stockCardPreview) URL.revokeObjectURL(stockCardPreview);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      navigate('/auth');
      return;
    }

    if (photos.length === 0) {
      toast.error('Please add at least one photo');
      return;
    }

    // Validate select fields
    const requiredSelects: { field: keyof typeof formData; label: string }[] = [
      { field: 'category', label: 'Category' },
      { field: 'location', label: 'Location' },
      { field: 'health', label: 'Health status' },
      ...(!isEditMode ? [{ field: 'duration' as keyof typeof formData, label: 'Duration' }] : []),
    ];

    const missingFields = requiredSelects.filter(({ field }) => !formData[field]).map(({ label }) => label);
    if (missingFields.length > 0) {
      toast.error(`Please select: ${missingFields.join(', ')}`);
      return;
    }

    // Validate starting price
    const parsedPrice = parseFloat(formData.startingPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      toast.error('Starting price must be a positive number');
      return;
    }

    try {
      // Upload new images if configured
      let imageUrls: string[] = [];
      if (isSupabaseConfigured && photoFiles.length > 0) {
        // Keep existing remote URLs, upload only new files
        const existingUrls = photos.filter(url => !url.startsWith('blob:'));
        for (const file of photoFiles) {
          const url = await uploadImage.mutateAsync({ file, userId: user.id });
          existingUrls.push(url);
        }
        imageUrls = existingUrls;
      } else {
        imageUrls = photos;
      }

      // Upload stock card if provided
      let stockCardUrl: string | undefined;
      if (isSupabaseConfigured && stockCardFile) {
        stockCardUrl = await uploadImage.mutateAsync({ file: stockCardFile, userId: user.id });
      }

      if (isEditMode && editId) {
        const updates: Record<string, any> = {
          id: editId,
          title: formData.title,
          breed: formData.breed,
          age: formData.age,
          weight: formData.weight,
          description: formData.description,
          location: formData.location,
          health: formData.health,
          image_urls: imageUrls,
        };

        if (stockCardUrl) updates.stock_card_url = stockCardUrl;

        if (!hasBids) {
          updates.starting_price = parsedPrice;
        }

        await updateListing.mutateAsync(updates as any);
        toast.success('Listing updated successfully!');
      } else {
        const durationMap: Record<string, number> = { '1 day': 1, '3 days': 3, '7 days': 7, '14 days': 14 };

        await createListing.mutateAsync({
          title: formData.title,
          category: formData.category,
          breed: formData.breed,
          age: formData.age,
          weight: formData.weight,
          description: formData.description,
          location: formData.location,
          health: formData.health,
          starting_price: parsedPrice,
          duration_days: durationMap[formData.duration] || 7,
          image_urls: imageUrls,
          ...(stockCardUrl && { stock_card_url: stockCardUrl }),
        });
        toast.success('Listing submitted for review!');
      }

      setTimeout(() => navigate('/my-listings'), 1500);
    } catch (err: any) {
      toast.error(err.message || (isEditMode ? 'Failed to update listing' : 'Failed to create listing'));
    }
  };

  const isSubmitting = createListing.isPending || updateListing.isPending || uploadImage.isPending;

  if (isEditMode && loadingItem) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 bg-background z-10 border-b p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-muted animate-pulse" />
          <div className="h-5 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className="p-4 space-y-6">
          <div className="grid grid-cols-4 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="h-10 w-full rounded bg-muted animate-pulse" />
            <div className="h-10 w-full rounded bg-muted animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 rounded bg-muted animate-pulse" />
              <div className="h-10 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-24 w-full rounded bg-muted animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-4 w-36 rounded bg-muted animate-pulse" />
            <div className="h-10 w-full rounded bg-muted animate-pulse" />
            <div className="h-10 w-full rounded bg-muted animate-pulse" />
          </div>
          <div className="h-12 w-full rounded bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 bg-background z-10 border-b p-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center transition-colors duration-200" aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-xl">{isEditMode ? 'Edit Listing' : 'Post Livestock'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-8">
        <div>
          <Label className="mb-3 block text-xs font-semibold text-slate-500 uppercase tracking-wider">PHOTOS</Label>
          <div className="grid grid-cols-4 gap-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative aspect-square bg-muted rounded-xl overflow-hidden transition-transform duration-200 hover:scale-[1.02]">
                <img src={photo} alt={`Listing photo ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handlePhotoRemove(index)}
                  aria-label={`Remove photo ${index + 1}`}
                  className="absolute top-1 right-1 w-9 h-9 bg-red-500 text-white rounded-full flex items-center justify-center transition-all duration-150 active:scale-90"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {photos.length < 4 && (
              <button
                type="button"
                onClick={handlePhotoAdd}
                aria-label="Add photo"
                className="aspect-square bg-muted rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-emerald-500 transition-all duration-200 hover:scale-[1.02]"
              >
                <Plus className="w-8 h-8 text-muted-foreground" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{photos.length === 0 ? 'Add at least 1 photo (up to 4)' : 'Up to 4 photos'}</p>
        </div>

        <div className="space-y-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">BASIC INFO</h3>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" className="transition-all duration-200" placeholder="e.g., Ngoni Bull" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
              <SelectTrigger id="category" className="transition-all duration-200"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="breed">Breed</Label>
            <Input id="breed" className="transition-all duration-200" placeholder="e.g., Brahman" value={formData.breed} onChange={(e) => setFormData({ ...formData, breed: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input id="age" className="transition-all duration-200" placeholder="e.g., 3 yrs" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <Input id="weight" className="transition-all duration-200" placeholder="e.g., 450 kg" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" className="transition-all duration-200" placeholder="Describe your livestock..." rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
          </div>
        </div>

        <div className="space-y-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">LOCATION & HEALTH</h3>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select value={formData.location} onValueChange={(v) => setFormData({ ...formData, location: v })}>
              <SelectTrigger id="location" className="transition-all duration-200"><SelectValue placeholder="Select location" /></SelectTrigger>
              <SelectContent>
                {locations.map(loc => (<SelectItem key={loc} value={loc}>{loc}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="health">Health</Label>
            <Select value={formData.health} onValueChange={(v) => setFormData({ ...formData, health: v })}>
              <SelectTrigger id="health" className="transition-all duration-200"><SelectValue placeholder="Select health status" /></SelectTrigger>
              <SelectContent>
                {healthStatuses.map(status => (<SelectItem key={status} value={status}>{status}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Stock Card / Vet Certificate</Label>
            {stockCardPreview || (isEditMode && existingItem && (existingItem as any).stock_card_url) ? (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-sm text-emerald-800 truncate flex-1">
                  {stockCardFile?.name || 'Stock card uploaded'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (stockCardPreview) URL.revokeObjectURL(stockCardPreview);
                    setStockCardFile(null);
                    setStockCardPreview(null);
                  }}
                  className="w-9 h-9 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0"
                  aria-label="Remove stock card"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*,.pdf';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      setStockCardFile(file);
                      setStockCardPreview(URL.createObjectURL(file));
                    }
                  };
                  input.click();
                }}
                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-emerald-500 transition-all duration-200 text-sm text-muted-foreground"
              >
                <Upload className="w-5 h-5" />
                <span>Upload stock card (photo or PDF)</span>
              </button>
            )}
            <p className="text-xs text-muted-foreground">Builds buyer trust — shows health and ownership proof</p>
          </div>
        </div>

        <div className="space-y-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">AUCTION DETAILS</h3>
          <div className="space-y-2">
            <Label htmlFor="price">Starting Price (US$)</Label>
            <Input id="price" className="h-14 text-xl font-semibold tracking-wide transition-all duration-200" type="number" placeholder="e.g., 800" value={formData.startingPrice} onChange={(e) => setFormData({ ...formData, startingPrice: e.target.value })} required disabled={isEditMode && hasBids} />
            {isEditMode && hasBids && (
              <p className="text-xs text-muted-foreground">Price cannot be changed after bids are placed</p>
            )}
          </div>
          {!isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select value={formData.duration} onValueChange={(v) => setFormData({ ...formData, duration: v })}>
                <SelectTrigger id="duration" className="transition-all duration-200"><SelectValue placeholder="Select duration" /></SelectTrigger>
                <SelectContent>
                  {durations.map(dur => (<SelectItem key={dur} value={dur}>{dur}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 space-y-1 text-sm">
            <p className="flex items-center gap-2"><span className="text-emerald-600">{"\u2713"}</span><span>5% platform fee</span></p>
            <p className="flex items-center gap-2"><span className="text-emerald-600">{"\u2713"}</span><span>48hr payment window</span></p>
            <p className="flex items-center gap-2"><span className="text-emerald-600">{"\u2713"}</span><span>Inspection allowed</span></p>
          </div>
        </div>

        <div className="pt-4">
          <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-semibold transition-all duration-150 active:scale-[0.98]" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isEditMode ? 'Updating...' : 'Posting...'}</>
            ) : isEditMode ? 'Update Listing' : 'Post Listing'}
          </Button>
          <p className="text-xs text-center text-slate-500 mt-2">Reviewed within 24hrs</p>
        </div>
      </form>
    </div>
  );
}
