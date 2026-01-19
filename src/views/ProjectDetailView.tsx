import React from "react";
import { ArrowLeft, Activity, FileText } from "lucide-react";
import { projectIcons } from "../utils/project-icons";
import { Project, Activity as ActivityType, Note } from "../models";
import dayjs from "dayjs";
import "dayjs/locale/fr";

interface ProjectDetailViewProps {
  project: Project;
  activities: ActivityType[];
  notes: Note[];
  onBack: () => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
}

export default function ProjectDetailView({
  project,
  activities,
  notes,
  onBack,
}: ProjectDetailViewProps) {
  const matchedIcon = project.iconName
    ? projectIcons.find((icon) => icon.name === project.iconName)
    : null;
  const IconComponent =
    matchedIcon?.component || projectIcons[0].component;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={onBack}
          className="flex items-center text-indigo-600 hover:text-indigo-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux projets
        </button>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center mb-4">
            <IconComponent
              className="w-10 h-10 mr-4"
              style={{ color: project.iconColor }}
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {project.name}
              </h1>
              <p className="text-gray-600">{project.description}</p>
            </div>
          </div>

          <div className="flex gap-4 flex-wrap">
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              Créé le {dayjs(project.date).locale("fr").format("DD MMM YYYY")}
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              ID {project.id}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Activity className="w-5 h-5 mr-2 text-indigo-600" />
              <h2 className="text-xl font-semibold">Activités récentes</h2>
            </div>

            <div className="space-y-3">
              {activities
                .filter((activity) => activity.projectId === project.id)
                .map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <Activity className="w-4 h-4 mt-1 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {dayjs(activity.createdAt)
                          .locale("fr")
                          .format("DD MMM YYYY")}
                      </p>
                    </div>
                  </div>
                ))}
              {activities.filter(
                (activity) => activity.projectId === project.id
              ).length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  Aucune activité pour le moment
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <FileText className="w-5 h-5 mr-2 text-indigo-600" />
              <h2 className="text-xl font-semibold">Notes</h2>
            </div>

            <div className="space-y-3">
              {notes
                .filter((note) => note.projectId === project.id)
                .map((note) => (
                  <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {note.title}
                    </h3>
                    <p className="text-sm text-gray-600">{note.content}</p>
                  </div>
                ))}
              {notes.filter((note) => note.projectId === project.id).length ===
                0 && (
                <p className="text-gray-500 text-center py-4">
                  Aucune note pour le moment
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
