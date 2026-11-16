"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Journal = {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
};

type AuthorEntry = {
  id?: string;
  givenName: string;
  familyName: string;
  email: string;
  affiliation: string;
  orcid: string;
  corresponding: boolean;
};

type FileEntry = {
  id?: string;
  file?: File;
  filename: string;
  category: string;
  sizeBytes: number;
  uploading?: boolean;
  uploaded?: boolean;
};

const STEPS = [
  { id: "metadata", title: "Article Details", description: "Title, abstract, and keywords" },
  { id: "authors", title: "Authors", description: "Add co-authors and affiliations" },
  { id: "files", title: "Files", description: "Upload manuscript and supplementary files" },
  { id: "cover", title: "Cover Letter", description: "Optional message to the editor" },
  { id: "disclosures", title: "Disclosures", description: "Conflicts, funding, and ethics" },
  { id: "review", title: "Review & Submit", description: "Check everything and submit" },
];

interface WizardProps {
  journals: Journal[];
  defaultJournalId?: string;
  userName: string;
  userEmail: string;
}

export function SubmissionWizard({ journals, defaultJournalId, userName, userEmail }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Form state
  const [journalId, setJournalId] = useState(defaultJournalId || "");
  const [sectionId, setSectionId] = useState("");
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [keywords, setKeywords] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [conflictOfInterest, setConflictOfInterest] = useState("");
  const [funding, setFunding] = useState("");
  const [dataAvailability, setDataAvailability] = useState("");
  const [ethicsApproval, setEthicsApproval] = useState("");

  const nameParts = userName.split(" ");
  const [authors, setAuthors] = useState<AuthorEntry[]>([
    {
      givenName: nameParts[0] || "",
      familyName: nameParts.slice(1).join(" ") || "",
      email: userEmail,
      affiliation: "",
      orcid: "",
      corresponding: true,
    },
  ]);
  const [files, setFiles] = useState<FileEntry[]>([]);

  const selectedJournal = journals.find((j) => j.id === journalId);

  // Create or update the draft submission
  const saveDraft = useCallback(async () => {
    setSaving(true);
    setErrors([]);
    try {
      if (!submissionId) {
        // Create new draft
        const res = await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            journalId,
            sectionId: sectionId || undefined,
            title: title || "Untitled",
            abstract: abstract || undefined,
            keywords: keywords ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create submission");
        }
        const data = await res.json();
        setSubmissionId(data.id);
        return data.id;
      } else {
        // Update existing draft
        const res = await fetch(`/api/submissions/${submissionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            abstract,
            keywords: keywords ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
            sectionId: sectionId || undefined,
            coverLetter: coverLetter || undefined,
            conflictOfInterest: conflictOfInterest || undefined,
            funding: funding || undefined,
            dataAvailability: dataAvailability || undefined,
            ethicsApproval: ethicsApproval || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to save");
        }
        return submissionId;
      }
    } catch (err) {
      setErrors([(err as Error).message]);
      return null;
    } finally {
      setSaving(false);
    }
  }, [submissionId, journalId, sectionId, title, abstract, keywords, coverLetter, conflictOfInterest, funding, dataAvailability, ethicsApproval]);

  const uploadFiles = async (sid: string) => {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.uploaded || !f.file) continue;

      setFiles((prev) => prev.map((p, idx) => (idx === i ? { ...p, uploading: true } : p)));

      const formData = new FormData();
      formData.append("file", f.file);
      formData.append("category", f.category);

      const res = await fetch(`/api/submissions/${sid}/files`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setFiles((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, id: data.id, uploading: false, uploaded: true } : p
          )
        );
      } else {
        const errData = await res.json().catch(() => ({ error: "Upload failed" }));
        setErrors((prev) => [...prev, `Failed to upload ${f.filename}: ${errData.error}`]);
        setFiles((prev) => prev.map((p, idx) => (idx === i ? { ...p, uploading: false } : p)));
      }
    }
  };

  const handleNext = async () => {
    setErrors([]);

    // Validate current step
    if (step === 0) {
      const errs: string[] = [];
      if (!journalId) errs.push("Select a journal");
      if (!title.trim()) errs.push("Title is required");
      if (!abstract.trim()) errs.push("Abstract is required");
      if (errs.length > 0) { setErrors(errs); return; }
    }

    if (step === 1) {
      const errs: string[] = [];
      for (let i = 0; i < authors.length; i++) {
        if (!authors[i].givenName.trim()) errs.push(`Author ${i + 1}: Given name is required`);
        if (!authors[i].familyName.trim()) errs.push(`Author ${i + 1}: Family name is required`);
        if (!authors[i].email.trim()) errs.push(`Author ${i + 1}: Email is required`);
      }
      if (!authors.some((a) => a.corresponding)) errs.push("A corresponding author must be designated");
      if (errs.length > 0) { setErrors(errs); return; }
    }

    if (step === 2) {
      if (files.length === 0) {
        setErrors(["At least one file is required"]);
        return;
      }
      if (!files.some((f) => f.category === "Manuscript")) {
        setErrors(["A manuscript file is required"]);
        return;
      }
    }

    // Save draft on first step completion
    if (step === 0) {
      const sid = await saveDraft();
      if (!sid) return;
    } else if (step > 0 && submissionId) {
      await saveDraft();
    }

    // Upload files on files step
    if (step === 2 && submissionId) {
      await uploadFiles(submissionId);
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSubmit = async () => {
    if (!submissionId) return;
    setSubmitting(true);
    setErrors([]);

    // Final save
    await saveDraft();

    // Upload any remaining files
    await uploadFiles(submissionId);

    // Submit
    const res = await fetch(`/api/submissions/${submissionId}/submit`, {
      method: "POST",
    });

    if (!res.ok) {
      const data = await res.json();
      setErrors(data.details || [data.error || "Submission failed"]);
      setSubmitting(false);
      return;
    }

    router.push(`/dashboard?submitted=${submissionId}`);
  };

  const addAuthor = () => {
    setAuthors((prev) => [
      ...prev,
      { givenName: "", familyName: "", email: "", affiliation: "", orcid: "", corresponding: false },
    ]);
  };

  const updateAuthor = (index: number, field: keyof AuthorEntry, value: string | boolean) => {
    setAuthors((prev) =>
      prev.map((a, i) => {
        if (i !== index) return field === "corresponding" && value === true ? { ...a, corresponding: false } : a;
        return { ...a, [field]: value };
      })
    );
  };

  const removeAuthor = (index: number) => {
    if (authors.length <= 1) return;
    setAuthors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  };

  const addFiles = (newFiles: File[]) => {
    const entries: FileEntry[] = newFiles.map((f) => ({
      file: f,
      filename: f.name,
      category: f.name.toLowerCase().endsWith(".pdf") || f.name.toLowerCase().endsWith(".docx") || f.name.toLowerCase().endsWith(".doc")
        ? "Manuscript"
        : "Supplementary",
      sizeBytes: f.size,
    }));
    setFiles((prev) => [...prev, ...entries]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      {/* Step indicators */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                i === step
                  ? "bg-brand-500 text-white"
                  : i < step
                    ? "bg-brand-100 text-brand-700 hover:bg-brand-200 cursor-pointer"
                    : "bg-gray-100 text-gray-400"
              )}
            >
              {i < step ? "\u2713" : i + 1}
            </button>
            <span className={cn("hidden text-xs sm:block", i === step ? "text-navy-950 font-medium" : "text-gray-400")}>
              {s.title}
            </span>
            {i < STEPS.length - 1 && <div className="hidden h-px w-6 bg-gray-200 sm:block" />}
          </div>
        ))}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <ul className="list-inside list-disc text-sm text-red-700">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Step content */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        {/* Step 0: Metadata */}
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-heading font-semibold text-navy-950">Article Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Journal *</label>
              <select
                value={journalId}
                onChange={(e) => { setJournalId(e.target.value); setSectionId(""); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Select a journal...</option>
                {journals.map((j) => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
            </div>

            {selectedJournal && selectedJournal.sections.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">Select a section...</option>
                  {selectedJournal.sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your manuscript title"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Abstract * <span className="text-gray-400 font-normal">({abstract.length} characters)</span>
              </label>
              <textarea
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                rows={8}
                placeholder="Enter your abstract..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keywords <span className="text-gray-400 font-normal">(comma separated)</span>
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="machine learning, natural language processing, transformers"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
        )}

        {/* Step 1: Authors */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-heading font-semibold text-navy-950">Authors</h2>
              <button
                onClick={addAuthor}
                className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition-colors"
              >
                + Add Author
              </button>
            </div>

            {authors.map((author, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Author {i + 1}</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-gray-600">
                      <input
                        type="radio"
                        name="corresponding"
                        checked={author.corresponding}
                        onChange={() => updateAuthor(i, "corresponding", true)}
                        className="accent-brand-500"
                      />
                      Corresponding
                    </label>
                    {authors.length > 1 && (
                      <button onClick={() => removeAuthor(i)} className="text-xs text-red-500 hover:text-red-700">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text" placeholder="Given name *" value={author.givenName}
                    onChange={(e) => updateAuthor(i, "givenName", e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                  <input
                    type="text" placeholder="Family name *" value={author.familyName}
                    onChange={(e) => updateAuthor(i, "familyName", e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                  <input
                    type="email" placeholder="Email *" value={author.email}
                    onChange={(e) => updateAuthor(i, "email", e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                  <input
                    type="text" placeholder="Affiliation" value={author.affiliation}
                    onChange={(e) => updateAuthor(i, "affiliation", e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                  <input
                    type="text" placeholder="ORCID (0000-0000-0000-0000)" value={author.orcid}
                    onChange={(e) => updateAuthor(i, "orcid", e.target.value)}
                    className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Files */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-heading font-semibold text-navy-950">Files</h2>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-brand-500 transition-colors cursor-pointer"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.multiple = true;
                input.accept = ".pdf,.doc,.docx,.tex,.png,.jpg,.jpeg,.zip";
                input.onchange = (e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.files) addFiles(Array.from(target.files));
                };
                input.click();
              }}
            >
              <div className="text-3xl mb-2">&#128196;</div>
              <p className="text-sm font-medium text-gray-700">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, DOCX, LaTeX, images. Max 50MB per file.
              </p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {f.category === "Manuscript" ? "\u{1F4C4}" : "\u{1F4CE}"}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{f.filename}</p>
                        <p className="text-xs text-gray-400">{formatSize(f.sizeBytes)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={f.category}
                        onChange={(e) =>
                          setFiles((prev) => prev.map((p, idx) => (idx === i ? { ...p, category: e.target.value } : p)))
                        }
                        className="rounded border border-gray-200 px-2 py-1 text-xs"
                      >
                        <option value="Manuscript">Manuscript</option>
                        <option value="Supplementary">Supplementary</option>
                        <option value="Figure">Figure</option>
                        <option value="Table">Table</option>
                        <option value="CoverLetter">Cover Letter</option>
                      </select>
                      {f.uploaded && <span className="text-xs text-green-600">{"\u2713"} Uploaded</span>}
                      {f.uploading && <span className="text-xs text-brand-500">Uploading...</span>}
                      {!f.uploaded && (
                        <button onClick={() => removeFile(i)} className="text-xs text-red-500 hover:text-red-700">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Cover Letter */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-heading font-semibold text-navy-950">Cover Letter</h2>
            <p className="text-sm text-gray-500">
              Optional. Address the editor and explain why your manuscript is suitable for this journal.
            </p>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={12}
              placeholder={"Dear Editor,\n\nWe are pleased to submit our manuscript titled..."}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        )}

        {/* Step 4: Disclosures */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-heading font-semibold text-navy-950">Disclosures</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conflict of Interest Statement</label>
              <textarea
                value={conflictOfInterest}
                onChange={(e) => setConflictOfInterest(e.target.value)}
                rows={3}
                placeholder="Declare any conflicts of interest or state 'The authors declare no conflicts of interest.'"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Funding</label>
              <textarea
                value={funding}
                onChange={(e) => setFunding(e.target.value)}
                rows={3}
                placeholder="List grants and funding sources, or state 'This research received no specific funding.'"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Availability</label>
              <textarea
                value={dataAvailability}
                onChange={(e) => setDataAvailability(e.target.value)}
                rows={3}
                placeholder="Describe how the data supporting this study can be accessed."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ethics Approval</label>
              <textarea
                value={ethicsApproval}
                onChange={(e) => setEthicsApproval(e.target.value)}
                rows={3}
                placeholder="If applicable, provide ethics committee approval details."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-heading font-semibold text-navy-950">Review & Submit</h2>

            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Journal</h3>
                <p className="text-sm text-navy-950">{selectedJournal?.name || "\u2014"}</p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Title</h3>
                <p className="text-sm text-navy-950 font-medium">{title || "\u2014"}</p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Abstract</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{abstract || "\u2014"}</p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Authors ({authors.length})</h3>
                <div className="space-y-1">
                  {authors.map((a, i) => (
                    <p key={i} className="text-sm text-gray-700">
                      {a.givenName} {a.familyName}
                      {a.corresponding && <span className="text-brand-500 ml-1">*</span>}
                      {a.affiliation && <span className="text-gray-400"> &mdash; {a.affiliation}</span>}
                    </p>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Files ({files.length})</h3>
                {files.length > 0 ? (
                  <div className="space-y-1">
                    {files.map((f, i) => (
                      <p key={i} className="text-sm text-gray-700">
                        {f.filename} <span className="text-gray-400">({f.category}, {formatSize(f.sizeBytes)})</span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-red-500">No files uploaded</p>
                )}
              </div>

              {keywords && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Keywords</h3>
                  <div className="flex flex-wrap gap-1">
                    {keywords.split(",").map((k, i) => (
                      <span key={i} className="rounded-full bg-navy-100 px-2 py-0.5 text-xs text-navy-700">
                        {k.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(s - 1, 0))}
          disabled={step === 0}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Back
        </button>

        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-gray-400">Saving...</span>}

          {step < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={saving}
              className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || saving}
              className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Submitting..." : "Submit Manuscript"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
