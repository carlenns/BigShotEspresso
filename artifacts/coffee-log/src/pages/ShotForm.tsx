import React from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { useCreateShot, getListShotsQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  shotDate: z.string(),
  bean: z.string().optional(),
  bag: z.string().optional(),
  dose: z.coerce.number().optional(),
  yield: z.coerce.number().optional(),
  pourTime: z.coerce.number().optional(),
  temperature: z.coerce.number().optional(),
  rating: z.number().min(1).max(10).optional(),
  status: z.string().optional(),
  isReference: z.boolean().default(false),
  notes: z.string().optional(),
});

export default function ShotForm() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createShot = useCreateShot();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shotDate: new Date().toISOString(),
      dose: 18,
      yield: 36,
      temperature: 94,
      rating: 5,
      isReference: false,
      status: "Dialed In",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createShot.mutate({ data: values }, {
      onSuccess: (data) => {
        toast({ title: "Shot logged successfully" });
        queryClient.invalidateQueries({ queryKey: getListShotsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setLocation(`/shots/${data.id}`);
      },
      onError: (error) => {
        toast({ title: "Failed to log shot", variant: "destructive" });
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/shots">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold font-serif">Log New Shot</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Beans & Grind</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="bean" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bean</FormLabel>
                  <FormControl><Input placeholder="e.g. Ethiopian Yirgacheffe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="bag" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bag Details / Roaster</FormLabel>
                  <FormControl><Input placeholder="e.g. Onyx Coffee Lab" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Extraction Specs</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="dose" render={({ field }) => (
                <FormItem>
                  <FormLabel>Dose (g)</FormLabel>
                  <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="yield" render={({ field }) => (
                <FormItem>
                  <FormLabel>Yield (g)</FormLabel>
                  <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="pourTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Time (s)</FormLabel>
                  <FormControl><Input type="number" step="1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="temperature" render={({ field }) => (
                <FormItem>
                  <FormLabel>Temp (°C)</FormLabel>
                  <FormControl><Input type="number" step="1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Dialed In">Dialed In</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Experimental">Experimental</SelectItem>
                      <SelectItem value="Fault">Fault</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evaluation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="rating" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex justify-between">
                    <span>Rating (1-10)</span>
                    <span className="font-bold text-primary">{field.value}</span>
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      defaultValue={[field.value || 5]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                      className="py-4"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tasting Notes & Observations</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Bright acidity, chocolate body..." className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="isReference" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Mark as Reference Shot</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Use this to find similar successful shots in the future
                    </div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" asChild>
              <Link href="/shots">Cancel</Link>
            </Button>
            <Button type="submit" disabled={createShot.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {createShot.isPending ? "Saving..." : "Save Shot"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
