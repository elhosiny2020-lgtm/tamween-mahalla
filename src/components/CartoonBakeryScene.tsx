import React, { useState } from 'react';
import { DEFAULT_OFFICIAL_LOGO } from '../defaultData';
import { Flame, Sparkles, Heart, Award, Shield } from 'lucide-react';

export const CartoonBakeryScene: React.FC = () => {
  const [isOvenActive, setIsOvenActive] = useState(true);
  const [bakedCount, setBakedCount] = useState(100);

  const handleBakeLoaf = () => {
    setBakedCount((prev) => prev + 1);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto flex flex-col items-center justify-center select-none p-3 text-center">
      {/* Warm Ambient Oven Glow Backdrop */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
        isOvenActive ? 'bg-gradient-to-r from-orange-600/25 via-amber-500/20 to-red-600/25' : 'bg-slate-800/20'
      }`} />

      {/* Main Container Card */}
      <div className="relative z-10 w-full bg-slate-950/90 backdrop-blur-xl border-2 border-amber-500/60 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4 flex flex-col items-center overflow-hidden">
        
        {/* Top Header Official Badge */}
        <div className="flex items-center justify-between w-full border-b border-slate-800 pb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-white p-1 border border-amber-400 shadow-md">
              <img src={DEFAULT_OFFICIAL_LOGO} alt="وزارة التموين" className="w-full h-full object-contain" />
            </div>
            <div className="text-right">
              <h3 className="text-xs font-black text-amber-300">منظومة المخابز البلدية والتموين</h3>
              <p className="text-[10px] font-bold text-slate-400">جمهورية مصر العربية &bull; وزارة التموين</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOvenActive(!isOvenActive)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md border ${
              isOvenActive
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-300 hover:scale-105'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Flame className={`w-4 h-4 ${isOvenActive ? 'text-slate-950 animate-bounce' : 'text-slate-500'}`} />
            <span>{isOvenActive ? 'الفرن يعمل 🔥' : 'الفرن هادئ 🌙'}</span>
          </button>
        </div>

        {/* Dynamic Vector SVG Animated Scene: Chef & Glowing Brick Oven */}
        <div className="relative w-full max-w-md h-72 sm:h-80 bg-gradient-to-b from-slate-900 via-slate-950 to-amber-950/60 rounded-2xl border border-amber-500/30 overflow-hidden shadow-inner flex items-center justify-center">
          
          {/* SVG Canvas */}
          <svg className="w-full h-full" viewBox="0 0 600 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            
            {/* Background Wall Tiles Texture */}
            <pattern id="brick-wall" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 0 0 L 40 0 L 40 20 L 0 20 Z" fill="#1e1b18" />
              <path d="M 0 10 L 40 10 M 20 0 L 20 10 M 20 10 L 20 20" stroke="#2d2822" strokeWidth="1.5" />
            </pattern>
            <rect width="600" height="400" fill="url(#brick-wall)" />

            {/* Ambient Oven Light Cone */}
            {isOvenActive && (
              <polygon points="120,320 0,400 350,400 280,320" fill="url(#fire-glow-cone)" opacity="0.35" />
            )}

            <defs>
              <radialGradient id="fire-glow-cone" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="fire-flame" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#facc15" />
              </linearGradient>
            </defs>

            {/* ========================================================
                1. ANIMATED BAKERY BRICK OVEN (الفرن البلدي المتحرك)
               ======================================================== */}
            <g id="bakery-oven">
              {/* Oven Outer Brick Arch Base */}
              <path d="M 60 380 L 60 210 Q 60 110 190 110 Q 320 110 320 210 L 320 380 Z" fill="#3f2314" stroke="#7c2d12" strokeWidth="6" />
              
              {/* Oven Arch Bricks Details */}
              <path d="M 75 220 Q 75 130 190 130 Q 305 130 305 220" stroke="#d97706" strokeWidth="8" strokeDasharray="14 6" fill="none" />

              {/* Inner Dark Fire Chamber */}
              <path d="M 95 370 L 95 240 Q 95 160 190 160 Q 285 160 285 240 L 285 370 Z" fill="#0f0906" stroke="#451a03" strokeWidth="4" />

              {/* Glowing Charcoal Bed */}
              <path d="M 100 340 Q 190 320 280 340 L 285 370 L 95 370 Z" fill="#7f1d1d" />

              {/* Flickering Animated Flames Inside Hearth */}
              {isOvenActive && (
                <g id="animated-flames">
                  {/* Outer Flame 1 */}
                  <path d="M 130 350 Q 145 280 160 310 Q 175 260 190 310 Q 210 270 230 320 Q 245 280 260 350 Z" fill="url(#fire-flame)" opacity="0.95">
                    <animate attributeName="d" 
                      values="
                        M 130 350 Q 145 280 160 310 Q 175 260 190 310 Q 210 270 230 320 Q 245 280 260 350 Z;
                        M 130 350 Q 140 260 160 300 Q 180 240 190 290 Q 205 250 230 300 Q 250 270 260 350 Z;
                        M 130 350 Q 145 280 160 310 Q 175 260 190 310 Q 210 270 230 320 Q 245 280 260 350 Z
                      "
                      dur="0.6s" repeatCount="indefinite" />
                  </path>

                  {/* Inner Yellow Core Flame */}
                  <path d="M 150 350 Q 165 300 185 315 Q 195 280 210 325 Q 230 300 240 350 Z" fill="#fef08a">
                    <animate attributeName="d" 
                      values="
                        M 150 350 Q 165 300 185 315 Q 195 280 210 325 Q 230 300 240 350 Z;
                        M 150 350 Q 160 280 185 300 Q 200 260 210 310 Q 225 285 240 350 Z;
                        M 150 350 Q 165 300 185 315 Q 195 280 210 325 Q 230 300 240 350 Z
                      "
                      dur="0.4s" repeatCount="indefinite" />
                  </path>

                  {/* Baking Baladi Loaves Inside Oven Hearth */}
                  <ellipse cx="145" cy="335" rx="22" ry="10" fill="#d97706" stroke="#78350f" strokeWidth="2" />
                  <ellipse cx="190" cy="330" rx="26" ry="12" fill="#f59e0b" stroke="#78350f" strokeWidth="2.5" />
                  <ellipse cx="235" cy="335" rx="22" ry="10" fill="#d97706" stroke="#78350f" strokeWidth="2" />
                  
                  {/* Toasting score lines on bread */}
                  <path d="M 175 330 Q 190 325 205 330" stroke="#78350f" strokeWidth="2" fill="none" />
                </g>
              )}

              {/* Rising Steam Clouds from Oven Chimney */}
              {isOvenActive && (
                <g id="oven-steam" opacity="0.6">
                  <circle cx="190" cy="100" r="12" fill="#f3f4f6">
                    <animate attributeName="cy" values="100;40;10" dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="r" values="12;22;32" dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0.3;0" dur="2.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="210" cy="110" r="10" fill="#f3f4f6">
                    <animate attributeName="cy" values="110;50;15" dur="3s" begin="0.8s" repeatCount="indefinite" />
                    <animate attributeName="r" values="10;18;28" dur="3s" begin="0.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0.2;0" dur="3s" begin="0.8s" repeatCount="indefinite" />
                  </circle>
                </g>
              )}
            </g>

            {/* ========================================================
                2. ANIMATED CARTOON CHEF CHARACTER (الشيف الكارتوني المتحرك)
               ======================================================== */}
            <g id="cartoon-chef" transform="translate(350, 60)">
              
              {/* Chef Body & White Double-Breasted Jacket */}
              <path d="M 70 230 L 50 330 L 190 330 L 170 230 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="3" />
              
              {/* Red Chef Apron / Belt */}
              <path d="M 60 280 L 180 280 L 185 330 L 55 330 Z" fill="#dc2626" />
              <path d="M 120 280 L 120 330" stroke="#991b1b" strokeWidth="3" />

              {/* Chef Red Neckerchief Scarf */}
              <path d="M 90 225 Q 120 245 150 225 Q 120 235 90 225 Z" fill="#dc2626" />
              <circle cx="120" cy="235" r="6" fill="#b91c1c" />

              {/* Chef Double-Breasted Black Buttons */}
              <circle cx="95" cy="245" r="4" fill="#1e293b" />
              <circle cx="95" cy="265" r="4" fill="#1e293b" />
              <circle cx="145" cy="245" r="4" fill="#1e293b" />
              <circle cx="145" cy="265" r="4" fill="#1e293b" />

              {/* Left Arm Holding Wooden Baker's Peel (مغرب المخبز) */}
              <g id="left-arm-peel">
                {/* Wooden Handle Paddle extending into oven */}
                <path d="M 110 260 L -120 290" stroke="#b45309" strokeWidth="10" strokeLinecap="round" />
                
                {/* Wooden Paddle Blade with Fresh Hot Loaf */}
                <polygon points="-120,270 -170,275 -170,305 -120,310" fill="#d97706" stroke="#92400e" strokeWidth="2" />
                
                {/* Fresh Hot Loaf on Paddle */}
                <ellipse cx="-145" cy="285" rx="22" ry="12" fill="#f59e0b" stroke="#78350f" strokeWidth="2" />
                
                {/* Steam Rising from Fresh Loaf */}
                <path d="M -155 270 Q -150 255 -155 240" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.7">
                  <animate attributeName="d" values="M -155 270 Q -150 255 -155 240; M -155 270 Q -160 255 -155 240; M -155 270 Q -150 255 -155 240" dur="1.2s" repeatCount="indefinite" />
                </path>
                <path d="M -135 270 Q -130 255 -135 240" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.7">
                  <animate attributeName="d" values="M -135 270 Q -130 255 -135 240; M -135 270 Q -140 255 -135 240; M -135 270 Q -130 255 -135 240" dur="1s" begin="0.3s" repeatCount="indefinite" />
                </path>

                {/* Left Hand Sleeve & Hand */}
                <path d="M 70 230 L 20 260 L 35 275 L 85 245 Z" fill="#ffffff" />
                <circle cx="20" cy="265" r="12" fill="#fbcfe8" />
              </g>

              {/* Right Arm (Waving Hand Greetings) */}
              <g id="right-arm-wave">
                <path d="M 170 230 Q 210 210 205 170" stroke="#ffffff" strokeWidth="22" strokeLinecap="round" fill="none" />
                
                {/* Waving Hand */}
                <g id="waving-hand">
                  <circle cx="205" cy="160" r="13" fill="#fbcfe8" />
                  {/* Fingers */}
                  <circle cx="198" cy="150" r="4" fill="#fbcfe8" />
                  <circle cx="205" cy="147" r="4" fill="#fbcfe8" />
                  <circle cx="212" cy="150" r="4" fill="#fbcfe8" />
                  
                  {/* Wave Animation transform */}
                  <animateTransform 
                    attributeName="transform" 
                    type="rotate" 
                    values="0 170 230; 12 170 230; -8 170 230; 0 170 230" 
                    dur="1.8s" 
                    repeatCount="indefinite" 
                  />
                </g>
              </g>

              {/* Chef Head & Friendly Face */}
              <g id="chef-head">
                {/* Ears */}
                <circle cx="75" cy="165" r="10" fill="#fbcfe8" />
                <circle cx="165" cy="165" r="10" fill="#fbcfe8" />

                {/* Head Base */}
                <ellipse cx="120" cy="165" rx="42" ry="48" fill="#fbcfe8" />

                {/* Friendly Eyes */}
                <ellipse cx="102" cy="155" rx="6" ry="8" fill="#0f172a" />
                <circle cx="104" cy="153" r="2.5" fill="#ffffff" />
                
                <ellipse cx="138" cy="155" rx="6" ry="8" fill="#0f172a" />
                <circle cx="140" cy="153" r="2.5" fill="#ffffff" />

                {/* Rosy Cheeks */}
                <ellipse cx="90" cy="170" rx="8" ry="5" fill="#f43f5e" opacity="0.4" />
                <ellipse cx="150" cy="170" rx="8" ry="5" fill="#f43f5e" opacity="0.4" />

                {/* Chef Master Mustache (شوارب الشيف) */}
                <path d="M 120 172 Q 100 168 85 178 Q 105 188 120 176 Q 135 188 155 178 Q 140 168 120 172 Z" fill="#1e1b18" />

                {/* Happy Smile Mouth */}
                <path d="M 106 182 Q 120 198 134 182 Z" fill="#991b1b" />
                <path d="M 112 192 Q 120 198 128 192" stroke="#f43f5e" strokeWidth="3" fill="none" />

                {/* Chef Nose */}
                <ellipse cx="120" cy="163" rx="7" ry="6" fill="#f472b6" />

                {/* ========================================================
                    TALL ANIMATED CHEF TOQUE HAT (قبعة الشيف الكارتونية)
                   ======================================================== */}
                <g id="chef-hat">
                  {/* Hat Band */}
                  <path d="M 80 130 L 160 130 L 162 145 L 78 145 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                  
                  {/* Puffy Toque Top with Bouncing Animation */}
                  <path d="M 75 130 Q 55 80 90 60 Q 120 40 150 60 Q 185 80 165 130 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="3">
                    <animateTransform 
                      attributeName="transform" 
                      type="scale" 
                      values="1 1; 1.03 1.06; 1 1" 
                      dur="2s" 
                      repeatCount="indefinite" 
                    />
                  </path>

                  {/* Red Ribbon on Hat */}
                  <path d="M 80 138 L 160 138" stroke="#dc2626" strokeWidth="4" />
                </g>
              </g>

            </g>

            {/* Sparkles / Magic Baking Stars floating around */}
            {isOvenActive && (
              <g id="baking-sparkles">
                <circle cx="80" cy="180" r="3" fill="#fde047">
                  <animate attributeName="opacity" values="0.2;1;0.2" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="310" cy="140" r="4" fill="#fde047">
                  <animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.8s" repeatCount="indefinite" />
                </circle>
                <circle cx="480" cy="80" r="3.5" fill="#fde047">
                  <animate attributeName="opacity" values="0.1;0.9;0.1" dur="1.2s" repeatCount="indefinite" />
                </circle>
              </g>
            )}

          </svg>

          {/* Interactive Loaf Badge Counter Overlay */}
          <div className="absolute bottom-3 right-3 bg-slate-900/90 border border-amber-500/50 rounded-xl px-3 py-1.5 shadow-lg flex items-center gap-2">
            <span className="text-xs font-black text-amber-300">خبز بلدي طازج:</span>
            <span className="text-xs font-black text-emerald-400 font-mono">{bakedCount.toLocaleString()} رغيف</span>
          </div>
        </div>

        {/* Action Button & Interactive Loaf Baker */}
        <div className="w-full flex items-center justify-between gap-3 pt-1">
          <div className="text-right">
            <h4 className="text-xs font-black text-amber-300">منظومة المخابز البلدية الذكية</h4>
            <p className="text-[10px] text-slate-400 font-bold">إنتاج الخبز البلدي المدعم وفقاً للمواصفات التموينية</p>
          </div>

          <button
            type="button"
            onClick={handleBakeLoaf}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg border border-amber-300 transition-all transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>خبز رغيف جديد 🍞</span>
          </button>
        </div>

      </div>
    </div>
  );
};
