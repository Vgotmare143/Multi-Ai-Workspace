import React, { useState } from 'react';
import {
  CheckCircle2,
  FolderGit2,
  FolderPlus,
  GitBranch,
  HardDrive,
  Shield,
} from 'lucide-react';
import {
  REQUIRED_PROJECT_AI_DIRS,
  useWorkspaceStore,
} from '../../stores/useWorkspaceStore';

export const ProjectSwitcherModal: React.FC = () => {
  const {
    projectModalOpen,
    projectRootPath,
    recentProjects,
    projectSnapshots,
    openProjectWorkspace,
    setProjectModalOpen,
  } = useWorkspaceStore();

  const [newPathInput, setNewPathInput] = useState('');
  const [newNameInput, setNewNameInput] = useState('');
  const [newBranchInput, setNewBranchInput] = useState('main');

  if (!projectModalOpen) {
    return null;
  }

  const activeSnapshot = projectSnapshots[projectRootPath];

  const handleOpenCustomProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPathInput.trim()) return;
    openProjectWorkspace(newPathInput, newNameInput || undefined, newBranchInput || 'main');
    setNewPathInput('');
    setNewNameInput('');
  };

  return (
    <div
      data-testid="project-switcher-modal"
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
    >
      <div className="bg-ide-panel border border-ide-border rounded-lg w-full max-w-2xl shadow-2xl overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-ide-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <FolderGit2 className="w-4 h-4 text-blue-400" />
            <span>Project & Workspace Manager (.project-ai/)</span>
          </div>
          <button
            type="button"
            onClick={() => setProjectModalOpen(false)}
            className="text-slate-400 hover:text-white px-2 py-1"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Open or Initialize Local Project Directory */}
          <form onSubmit={handleOpenCustomProject} className="space-y-3">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-emerald-400" />
              <span>Open Local Project Directory</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="text"
                required
                data-testid="open-project-path-input"
                placeholder="/workspace/my-new-project"
                value={newPathInput}
                onChange={(e) => setNewPathInput(e.target.value)}
                className="md:col-span-2 px-3 py-2 rounded bg-ide-bg border border-ide-border text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                data-testid="open-project-name-input"
                placeholder="Optional Display Name"
                value={newNameInput}
                onChange={(e) => setNewNameInput(e.target.value)}
                className="px-3 py-2 rounded bg-ide-bg border border-ide-border text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-ide-muted">
                <span>Git Branch:</span>
                <input
                  type="text"
                  value={newBranchInput}
                  onChange={(e) => setNewBranchInput(e.target.value)}
                  className="w-28 px-2 py-1 rounded bg-ide-bg border border-ide-border text-slate-200 font-mono"
                />
              </div>
              <button
                type="submit"
                data-testid="confirm-open-project-btn"
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium"
              >
                Open & Initialize .project-ai/
              </button>
            </div>
          </form>

          {/* Recent Projects List */}
          <div className="space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span>Recent Workspaces</span>
            </div>
            <div className="divide-y divide-ide-border border border-ide-border rounded bg-ide-bg">
              {recentProjects.map((proj) => {
                const isCurrent = proj.rootPath === projectRootPath;
                return (
                  <div
                    key={proj.rootPath}
                    className="p-3 flex items-center justify-between hover:bg-ide-hover/60"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{proj.projectName}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                            Active
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-slate-400 font-mono text-[11px]">
                          <GitBranch className="w-3 h-3 text-emerald-400" />
                          {proj.gitBranch}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-ide-muted">{proj.rootPath}</div>
                    </div>

                    <button
                      type="button"
                      data-testid={`switch-recent-${proj.projectName}`}
                      onClick={() =>
                        openProjectWorkspace(proj.rootPath, proj.projectName, proj.gitBranch)
                      }
                      className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    >
                      {isCurrent ? 'Reload State' : 'Switch Project'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active .project-ai/ On-Disk Structure Verification */}
          {activeSnapshot && (
            <div className="p-3.5 rounded bg-ide-bg border border-ide-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Platform-Owned State Directories ({projectRootPath}/.project-ai/)
                </span>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  9/9 Synchronized
                </span>
              </div>
              <div
                data-testid="project-ai-directory-badges"
                className="flex flex-wrap gap-1.5 pt-1"
              >
                {REQUIRED_PROJECT_AI_DIRS.map((dir) => (
                  <span
                    key={dir}
                    className="px-2 py-0.5 rounded bg-ide-panel border border-ide-border font-mono text-[11px] text-slate-300"
                  >
                    .project-ai/{dir}/
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
