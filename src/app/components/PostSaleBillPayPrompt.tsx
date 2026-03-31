import { useNavigate } from "react-router";
import { Zap, GraduationCap, Phone } from "lucide-react";

export function PostSaleBillPayPrompt() {
  const navigate = useNavigate();

  const quickActions = [
    { icon: <Zap className="w-5 h-5" />, label: 'ZESA', color: 'text-amber-600 bg-amber-50' },
    { icon: <GraduationCap className="w-5 h-5" />, label: 'School Fees', color: 'text-blue-600 bg-blue-50' },
    { icon: <Phone className="w-5 h-5" />, label: 'Airtime', color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-amber-50 border border-emerald-200 rounded-xl p-4 mt-4">
      <p className="font-semibold text-sm mb-3">Pay a bill with your earnings?</p>
      <div className="flex gap-3">
        {quickActions.map(action => (
          <button
            key={action.label}
            onClick={() => navigate('/pay-bill')}
            className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-lg ${action.color} transition-all duration-200 active:scale-95`}
          >
            {action.icon}
            <span className="text-xs font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
