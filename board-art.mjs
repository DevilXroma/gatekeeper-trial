// Independent decorative layer. Positions are relative to the junction grid;
// changing them does not change paths, hazards, gates, or puzzle solutions.
export const boardLandmarks = [
  {id:'crown',name:'Корона',c:.5,r:.5,paths:[
    'M-20 -10L-16 12H16L20 -10L9 -1L0 -17L-9 -1Z',
    'M-15 7H15M-14 17H14',
  ]},
  {id:'mountain',name:'Гора',c:2.5,r:.5,paths:[
    'M-24 16L-4 -18L10 4L16 -5L28 16Z',
    'M-12 -4L-5 0L0 -8L7 -1',
  ]},
  {id:'hand',name:'Ладонь',c:3.5,r:1.5,paths:[
    'M-9 20L-19 1Q-21 -5 -16 -4L-10 3V-13Q-10 -19 -6 -17L-5 -4V-21Q-5 -26 0 -23L1 -5V-19Q2 -24 6 -20L7 -3V-13Q9 -18 12 -13L13 8L7 20Z',
    'M-7 7Q0 3 6 7',
  ]},
  {id:'hammer',name:'Молот',c:.5,r:2.5,paths:[
    'M-18 -17H17V-4H-18ZM-4 -4V22H4V-4M-12 -17V-4M11 -17V-4',
  ]},
  {id:'fish',name:'Рыба',c:2.5,r:3.5,paths:[
    'M-22 0Q-3 -23 16 0Q-3 23 -22 0ZM16 0L27 -12V12ZM2 -11Q-6 0 2 11',
    'M-13 -2H-11M-5 -13L1 -20L7 -12',
  ]},
  {id:'horn',name:'Рог',c:3.5,r:3.5,paths:[
    'M-24 -17Q-14 21 15 15L25 -3L15 -11Q7 11 -24 -17ZM15 -11L25 -3M12 -5L21 3M-8 10L-9 21L0 24L4 14',
  ]},
];
