import { useState } from 'react';
import Modal from './Modal';

// Component for manually assigning images to projects with drag-and-drop
export default function ImageProjectMatcher({ projects, allImages, onConfirm, onCancel }) {
    // State: current assignments (projectIndex -> imageIndex[])
    const [assignments, setAssignments] = useState(() => {
        // Initialize with auto-matched assignments
        const initial = {};
        projects.forEach((project, idx) => {
            // Find indices of project's images in allImages array
            const imageIndices = project.images.map(img =>
                allImages.findIndex(allImg => allImg === img)
            ).filter(i => i !== -1);
            initial[idx] = imageIndices;
        });
        return initial;
    });

    const [draggedImage, setDraggedImage] = useState(null);

    // Get unassigned images
    const getUnassignedImages = () => {
        const assignedIndices = new Set();
        Object.values(assignments).forEach(indices => {
            indices.forEach(idx => assignedIndices.add(idx));
        });

        return allImages
            .map((img, idx) => ({ img, idx }))
            .filter(({ idx }) => !assignedIndices.has(idx));
    };

    // Handle drag start
    const handleDragStart = (imageIndex) => {
        setDraggedImage(imageIndex);
    };

    // Handle drop on project
    const handleDrop = (projectIndex) => {
        if (draggedImage === null) return;

        // Remove from previous assignment
        const newAssignments = { ...assignments };
        Object.keys(newAssignments).forEach(key => {
            newAssignments[key] = newAssignments[key].filter(idx => idx !== draggedImage);
        });

        // Add to new project
        if (!newAssignments[projectIndex]) {
            newAssignments[projectIndex] = [];
        }
        newAssignments[projectIndex].push(draggedImage);

        setAssignments(newAssignments);
        setDraggedImage(null);
    };

    // Handle remove image from project
    const handleRemoveImage = (projectIndex, imageIndex) => {
        const newAssignments = { ...assignments };
        newAssignments[projectIndex] = newAssignments[projectIndex].filter(idx => idx !== imageIndex);
        setAssignments(newAssignments);
    };

    // Handle confirm
    const handleConfirm = () => {
        // Convert assignments back to project format
        const updatedProjects = projects.map((project, idx) => ({
            ...project,
            images: (assignments[idx] || []).map(imgIdx => allImages[imgIdx]),
            confidence: 1.0 // Manual assignment = full confidence
        }));

        onConfirm(updatedProjects);
    };

    // Reset to auto-match
    const handleReset = () => {
        const initial = {};
        projects.forEach((project, idx) => {
            const imageIndices = project.images.map(img =>
                allImages.findIndex(allImg => allImg === img)
            ).filter(i => i !== -1);
            initial[idx] = imageIndices;
        });
        setAssignments(initial);
    };

    const unassignedImages = getUnassignedImages();

    return (
        <Modal
            isOpen={true}
            onClose={onCancel}
            footerContent={
                <div className="flex justify-between items-center w-full">
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 text-emerald-600 hover:text-emerald-700 transition-colors text-sm font-bold"
                    >
                        🔄 자동 매칭으로 초기화
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-stone-500 hover:text-stone-700 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg transition-all transform active:scale-95"
                        >
                            확인
                        </button>
                    </div>
                </div>
            }
        >
            <div className="p-1">
                <h2 className="text-2xl font-bold text-emerald-600 mb-4 text-center">
                    이미지-프로젝트 매칭
                </h2>

                <p className="text-sm text-stone-500 mb-6 text-center">
                    이미지를 드래그하여 프로젝트에 할당하세요
                </p>

                {/* Unassigned Images Section */}
                {unassignedImages.length > 0 && (
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-stone-600 mb-3">
                            📷 할당되지 않은 이미지 ({unassignedImages.length}개)
                        </label>
                        <div className="grid grid-cols-4 gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                            {unassignedImages.map(({ img, idx }) => (
                                <div
                                    key={idx}
                                    draggable
                                    onDragStart={() => handleDragStart(idx)}
                                    className="relative group cursor-move"
                                >
                                    <img
                                        src={img}
                                        alt={`Image ${idx + 1}`}
                                        className="w-full h-20 object-cover rounded-lg border-2 border-stone-200 hover:border-emerald-500 transition-all"
                                    />
                                    <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">드래그</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Projects Section */}
                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                    <label className="block text-sm font-bold text-stone-600 mb-3">
                        📋 프로젝트 목록
                    </label>
                    {projects.map((project, projectIdx) => (
                        <div
                            key={projectIdx}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop(projectIdx)}
                            className="p-4 bg-white border border-stone-200 rounded-xl hover:border-emerald-400 transition-all shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-stone-800">
                                    {project.title || `프로젝트 ${projectIdx + 1}`}
                                </h3>
                                {project.confidence < 1.0 && (
                                    <span className={`text-xs px-2 py-1 rounded font-bold ${project.confidence >= 0.7 ? 'bg-emerald-100 text-emerald-700' :
                                        project.confidence >= 0.5 ? 'bg-amber-100 text-amber-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                        자동 매칭 {Math.round(project.confidence * 100)}%
                                    </span>
                                )}
                            </div>

                            {/* Drop Zone */}
                            <div className="min-h-24 p-3 border-2 border-dashed border-stone-200 rounded-lg bg-stone-50">
                                {assignments[projectIdx]?.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {assignments[projectIdx].map((imgIdx) => (
                                            <div key={imgIdx} className="relative group">
                                                <img
                                                    src={allImages[imgIdx]}
                                                    alt={`Project ${projectIdx + 1} Image`}
                                                    className="w-full h-16 object-cover rounded border border-emerald-400"
                                                />
                                                <button
                                                    onClick={() => handleRemoveImage(projectIdx, imgIdx)}
                                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-stone-400 text-xs">
                                        이미지를 여기에 드롭하세요
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-xs text-stone-400 mt-4 text-center">
                    💡 이미지를 드래그하여 프로젝트에 할당하거나 제거할 수 있습니다
                </p>
            </div>
        </Modal>
    );
}
