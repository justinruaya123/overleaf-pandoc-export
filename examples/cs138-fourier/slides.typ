// CS 138 — Fourier series through the periodic eigenvalue problem.
// Student-facing text is intentionally sparse. See notes.typ for the script.
// Each frame has a stable identifier for current/next previews and QA.
// Native interleaved eq-alt advances exactly once between atomic states.

#import "scl-beamer/lib.typ": *
#import "slide-tools.typ": frame, prompt, stage, sanity, plot, ref-list

// Curious-student extensions belong to both handouts. The explicit flag
// also enables their reveal states while build.py renders handout previews.
#let student-handout = sys.inputs.at("student-handout", default: "false") == "true"
#let show-extensions = student-handout or (
  sys.inputs.at("show-extensions", default: "false") == "true"
)

#show: scl-theme.with(
  align: top,
  hide-all-subsections: true,
  config-common(
    handout: student-handout,
  ),
  config-info(
    title: [Fourier Series],
    subtitle: [From eigenfunctions to coordinates],
    short-title: [Fourier Series],
    author: [Justin Jose Ruaya],
    short-author: [J. J. Ruaya],
    institution: scl-affiliation,
    event: [CS 138],
    short-event: [CS 138],
    date: [S1 AY 2026–2027],
  ),
)

= The problem

#frame("start")[
  #v(7mm)
  #text(size: 19pt, fill: colors.structure)[
    From eigenfunctions\
    to coordinates
  ]
  #v(8mm)
  #text(size: 12pt)[Which waves? How much of each?]
  #v(7mm)
  #text(size: 8.5pt)[Recall: trigonometry · inner products · eigenvalue BVPs]
]

#frame("recall")[
  #prompt[Last lecture: find a shape that differentiation preserves.]
  #stage(height: 22mm)[
    $ y_n'' + lambda_n y_n = 0 $
  ]
  #pause
  #text(fill: colors.structure)[Today: use those shapes to solve]
  $ u-u''=f. $
  #pause
  #sanity[The function $f$ is given. The function $u$ is unknown.]
]

#frame("seam")[
  #prompt[The interval is $[-L,L]$. The full period is $2L$.]
  #stage(height: 27mm)[
    $ u(-L) &= u(L), \
      u'(-L) &= u'(L). $
  ]
  #pause
  $ omega_0 = pi/L, quad theta=omega_0 x in [-pi,pi]. $
  #text(size: 8pt)[L7 used $L$ for the full period. Here the full period is $2L$.]
  #text(size: 8pt)[For the BVP, assume $f$ is $C^2$ and periodic.]
]

#frame("one_mode")[
  #prompt[If $f=A y_n$, try $u=D y_n$. Recall $-y_n''=lambda_n y_n$.]
  #stage[
    #eq-alt((
      [$D y_n-D y_n''$], [$A y_n$],
      [$D y_n+D lambda_n y_n$], [$A y_n$],
      [$(1+lambda_n)D y_n$], [$A y_n$],
      [$(1+lambda_n)D$], [$A$],
      [$D$], [$A/(1+lambda_n)$],
    ))
  ]
  #pause
  #sanity[One shape. One scalar equation. The constant mode is unchanged.]
]

#frame("energy")[
  #prompt[For a real, nonzero periodic eigenfunction:]
  #stage(size: 12pt)[
    #eq-alt((
      [$lambda integral_(-L)^L y^2 dif x$], [$-integral_(-L)^L y y'' dif x$],
      [$lambda integral_(-L)^L y^2 dif x$],
        [$-[y y']_(-L)^L + integral_(-L)^L (y')^2 dif x$],
      [$lambda integral_(-L)^L y^2 dif x$], [$integral_(-L)^L (y')^2 dif x$],
    ))
  ]
  #pause
  #sanity[$lambda >= 0$. If $lambda=0$, then $y$ is constant.]
]

= Complex coordinates

#frame("turn")[
  #prompt[A complex number is a pair of real coordinates.]
  #grid(columns: (1fr, 1fr), gutter: 4mm,
    align(center)[
      #cetz.canvas(length: 10mm, {
        import cetz.draw: *
        circle((0, 0), radius: 1.45, stroke: (paint: rgb("c5cdda"), thickness: 0.5pt))
        line((-1.75, 0), (1.75, 0), stroke: (paint: rgb("c5cdda"), thickness: 0.4pt))
        line((0, -1.75), (0, 1.75), stroke: (paint: rgb("c5cdda"), thickness: 0.4pt))
        line((0, 0), (1.45, 0), stroke: colors.structure, mark: (end: ">"))
        line((0, 0), (0, 1.45), stroke: UPmaroon, mark: (end: ">"))
        content((1.8, 0), $1$)
        content((0, 1.8), $i$)
        content((-1.8, 0), $-1$)
        content((0, -1.8), $-i$)
      })
    ],
    [
      #v(4mm)
      $ i(a+i b)=-b+i a $
      #pause
      #v(4mm)
      #text(fill: colors.structure)[Multiplication by $i$:\ a quarter-turn.]
    ],
  )
  #v(3mm)
  #sanity[$i^2=-1$, and $i^4=1$.]
]

#frame("euler")[
  #prompt[Recall the absolutely convergent exponential series.]
  #stage(size: 12pt, height: 34mm)[
    #eq-alt((
      [$e^(i theta)$], [$1+i theta+(i theta)^2/2!+(i theta)^3/3!+(i theta)^4/4!+dots$],
      [$e^(i theta)$], [$1+i theta-theta^2/2!-i theta^3/3!+theta^4/4!+dots$],
      [$e^(i theta)$], [$(1-theta^2/2!+theta^4/4!-dots)+i(theta-theta^3/3!+dots)$],
      [$e^(i theta)$], [$cos theta+i sin theta$],
    ))
  ]
  #pause
  #sanity[$theta=0$ gives $1$; $theta=pi/2$ gives $i$; $abs(e^(i theta))=1$.]
]

#frame("rotate")[
  #prompt[$phi(x)=e^(i k x)$: one rotation, two real coordinates.]
  #grid(columns: (0.85fr, 1.15fr), gutter: 3mm,
    [#image("assets/plots/02a-unit-circle.svg", width: 100%, height: 39mm, fit: "contain")],
    [
      #stage(size: 12pt, height: 34mm)[
        #eq-alt((
          [$phi'(x)$], [$i k e^(i k x)$],
          [$phi''(x)$], [$(i k)^2 e^(i k x)$],
          [$-phi''(x)$], [$k^2 phi(x)$],
        ), width-factor: 1)
      ]
    ],
  )
  #sanity[$k$ and $-k$ rotate in opposite directions; both have eigenvalue $k^2$.]
]

#frame("quantize")[
  #prompt[Which rotations close after travelling a distance $2L$?]
  #stage[
    #eq-alt((
      [$e^(i k L)$], [$e^(-i k L)$],
      [$e^(2i k L)$], [$1$],
      [$2k L$], [$2pi n quad (n in bb(Z))$],
      [$k$], [$n pi/L = n omega_0$],
    ))
  ]
  #pause
  #sanity[Endpoint values and derivatives match. $n=0$ gives the constant.]
]

#frame("modes")[
  #prompt[$phi_n=e^(i n omega_0 x)$, $quad lambda_n=(n omega_0)^2$, $quad n in bb(Z)$. Picture: $L=pi$.]
  #plot("01-periodic-modes", height: 39mm)
  #pause
  #sanity[For $n >= 1$, the same eigenvalue has a cosine and a sine mode.]
]

= Measure a mode

#frame("average")[
  #prompt[Predict the average. Let $q$ be a nonzero integer.]
  #stage(size: 12pt)[
    #eq-alt((
      [$1/(2L) integral_(-L)^L e^(i q omega_0 x) dif x$],
        [$1/(2L) [e^(i q omega_0 x)/(i q omega_0)]_(-L)^L$],
      [$1/(2L) integral_(-L)^L e^(i q omega_0 x) dif x$],
        [$(e^(i q pi)-e^(-i q pi))/(2L i q omega_0)$],
      [$1/(2L) integral_(-L)^L e^(i q omega_0 x) dif x$], [$0$],
    ))
  ]
  #pause
  #sanity[Handle $q=0$ separately: the average of $1$ is $1$.]
]

#frame("freeze")[
  #prompt[To measure frequency $m$, multiply by $e^(-i m omega_0 x)$.]
  #pause
  #plot("03-freeze-and-average", height: 38mm)
  #pause
  #sanity[$e^(i n omega_0 x)e^(-i m omega_0 x)=e^(i(n-m)omega_0 x)$.]
  #text(size: 9pt, fill: colors.structure)[The desired mode stops. The others average to zero.]
]

#frame("isolate")[
  #prompt[Start with a finite sum: $F_N=sum_(n=-N)^N C_n phi_n$. Fix integer $m$, $abs(m) <= N$.]
  #stage(size: 11.5pt, height: 34mm)[
    #eq-alt((
      [$I_m$], [$1/(2L) integral_(-L)^L F_N e^(-i m omega_0 x) dif x$],
      [$I_m$],
        [$1/(2L) integral_(-L)^L sum_(n=-N)^N C_n e^(i(n-m)omega_0 x) dif x$],
      [$I_m$],
        [$sum_(n=-N)^N C_n (1/(2L) integral_(-L)^L e^(i(n-m)omega_0 x) dif x)$],
      [$I_m$],
        [$sum_(n=-N)^N C_n delta_(n m)$],
      [$I_m$], [$C_m$],
    ), width-factor: 1)
  ]
  #pause
  #sanity[$delta_(n m)=1$ if $n=m$; otherwise $0$. Only one term survives.]
]

#frame("coefficient")[
  #prompt[Recall the coordinate of an orthogonal projection.]
  #stage(size: 13pt)[
    #eq-alt((
      [$C_n$], [$(⟨ f,phi_n ⟩)/(⟨ phi_n,phi_n ⟩)$],
      [$C_n$], [$1/(2L) integral_(-L)^L f(x)e^(-i n omega_0 x) dif x$],
    ))
  ]
  #pause
  $ ⟨ f,g ⟩ = integral_(-L)^L f(x) overline(g(x)) dif x. $
  #sanity[$⟨ phi_n,phi_n ⟩=integral_(-L)^L abs(phi_n)^2 dif x=2L$.]
]

#frame("best")[
  #prompt[Let $S_N=sum_(n=-N)^N C_n phi_n$. Take $v in V_N$ and $r=f-S_N$, with $r perp V_N$.]
  #stage(size: 12pt)[
    #eq-alt((
      [$norm(f-v)^2$], [$norm(r+(S_N-v))^2$],
      [$norm(f-v)^2$], [$norm(r)^2+norm(S_N-v)^2$],
      [$min_(v in V_N) norm(f-v)^2$], [$norm(f-S_N)^2$],
    ))
  ]
  #pause
  #sanity[$V_N=op("span"){phi_(-N),dots,phi_N}$. This is the best finite fit.]
]

#frame("limit")[
  #prompt[Orthogonality chooses coefficients. Completeness justifies the limit.]
  #stage(height: 23mm)[
    $ norm(f-S_N)_2 arrow.r 0 quad (f in L^2([-L,L])). $
  ]
  #pause
  #text(size: 10pt)[For a piecewise $C^1$ periodic function:]
  $ lim_(N arrow.r oo) S_N(x) = (f(x^-)+f(x^+))/2. $
  #pause
  #sanity[At a continuous point, the limit is $f(x)$.]
]

= Real Fourier series

#frame("real")[
  #prompt[Now suppose that $f$ is real-valued.]
  #stage(size: 12pt)[
    #eq-alt((
      [$overline(C_n)$], [$overline(1/(2L) integral_(-L)^L f(x)e^(-i n omega_0 x) dif x)$],
      [$overline(C_n)$], [$1/(2L) integral_(-L)^L f(x)e^(i n omega_0 x) dif x$],
      [$overline(C_n)$], [$C_(-n)$],
    ))
  ]
  #pause
  #sanity[If $C_2=-2i$, then $C_(-2)=2i$.]
]

#frame("geometry")[
  #prompt[Write $C_n=R_n e^(i alpha_n)$. Magnitude gives radius; angle gives phase.]
  #grid(columns: (1fr, 1.2fr), gutter: 3mm,
    [#image("assets/plots/02b-conjugate-pair.svg", width: 100%, height: 38mm, fit: "contain")],
    [
      #stage(size: 11.5pt, height: 30mm)[
        #eq-alt((
          [$C_n e^(i n omega_0 x)$], [$R_n e^(i alpha_n)e^(i n omega_0 x)$],
          [$C_n e^(i n omega_0 x)$], [$R_n e^(i(n omega_0 x+alpha_n))$],
        ), width-factor: 1)
      ]
    ],
  )
  #sanity[The pictured conjugate pair has no imaginary component in its sum.]
]

#frame("pair")[
  #prompt[Write $C_n=(a_n-i b_n)/2$ and $psi=n omega_0 x$, for $n >= 1$.]
  #stage(size: 12pt, height: 31mm)[
    #eq-alt((
      [$C_n e^(i psi)+C_(-n)e^(-i psi)$],
        [$(a_n-i b_n)/2 e^(i psi)+(a_n+i b_n)/2 e^(-i psi)$],
      [$C_n e^(i psi)+C_(-n)e^(-i psi)$],
        [$a_n (e^(i psi)+e^(-i psi))/2+b_n (e^(i psi)-e^(-i psi))/(2i)$],
      [$C_n e^(i psi)+C_(-n)e^(-i psi)$], [$a_n cos psi+b_n sin psi$],
    ), width-factor: 1)
  ]
  #pause
  #sanity[$cos psi$ uses $1/2,1/2$; $sin psi$ uses $-i/2,i/2$.]
]

#frame("series")[
  #prompt[Pair the positive and negative frequencies. Keep the mean.]
  #stage(size: 12pt, height: 30mm)[
    #eq-alt((
      [$S_N(x)$], [$sum_(n=-N)^N C_n e^(i n omega_0 x)$],
      [$S_N(x)$], [$a_0+sum_(n=1)^N (a_n cos(n omega_0 x)+b_n sin(n omega_0 x))$],
    ), width-factor: 1)
  ]
  #pause
  #text(fill: colors.structure)[The Fourier series is the limit of these partial sums.]
  #sanity[Our convention: $a_0=C_0$ is the mean. Full period: $2L$.]
]

#frame("formulas")[
  #prompt[Coefficient = inner product ÷ squared length.]
  #stage(size: 13pt, height: 32mm)[
    #eq-alt((
      [$a_0$], [$1/(2L) integral_(-L)^L f(x) dif x$],
      [$a_n$], [$1/L integral_(-L)^L f(x) cos(n pi x/L) dif x$],
      [$b_n$], [$1/L integral_(-L)^L f(x) sin(n pi x/L) dif x$],
    ))
  ]
  #pause
  #sanity[$norm(1)^2=2L$; $quad norm(cos(n omega_0 x))^2=norm(sin(n omega_0 x))^2=L$, $n >= 1$.]
]

#frame("tent")[
  #prompt[$f(x)=1-abs(x)/L$, $quad -L <= x <= L$; extend periodically.]
  #grid(columns: (1.4fr, 1fr), gutter: 4mm,
    [#image("assets/plots/04a-tent-target.svg", width: 100%, height: 38mm, fit: "contain")],
    [
      #v(3mm)
      Predict the mean.
      #pause
      $ a_0=1/2. $
      #pause
      Predict the sine coefficients.
      #pause
      $ b_n=0. $
    ],
  )
  #sanity[Use area and symmetry before integration.]
]

#frame("tent_coeff")[
  #prompt[For $n >= 1$, set $k=n pi/L$. The tent is even.]
  #stage(size: 13pt, height: 32mm)[
    #eq-alt((
      [$a_n$], [$2/L integral_0^L (1-x/L) cos(k x) dif x$],
      [$a_n$], [$2/(L^2 k) integral_0^L sin(k x) dif x$],
      [$a_n$], [$2(1-cos(k L))/(L^2 k^2)$],
      [$a_n$], [$2(1-(-1)^n)/(n^2 pi^2)$],
    ))
  ]
  #pause
  #sanity[Even $n$: $0$. Odd $n$: $4/(pi^2 n^2)$. The first coefficient is positive.]
]

#frame("tent_sum")[
  #prompt[$f(x)=1/2+4/pi^2 sum_(n>=1, n " odd") cos(n pi x/L)/n^2$.]
  #plot("04-periodic-tent-reconstruction", height: 42mm)
  #sanity[At $x=0$, the limit is $1$. At $x=±L$, the limit is $0$.]
]

= Use the coordinates

#frame("filter")[
  #prompt[Return to $u-u''=f$. Let $C_n$ force the mode; let $D_n$ solve it.]
  #stage(size: 13pt)[
    #eq-alt((
      [$D_n phi_n-D_n phi_n''$], [$C_n phi_n$],
      [$(1+lambda_n)D_n phi_n$], [$C_n phi_n$],
      [$(1+lambda_n)D_n$], [$C_n$],
      [$D_n$], [$C_n/(1+(n pi/L)^2)$],
    ))
  ]
  #pause
  #sanity[Exact for finite sums. For $C^2$ periodic $f$, the limit is justified.]
]

#frame("example")[
  #prompt[$L=pi$, $quad f(x)=2+3 cos x+4 sin(2x)$.]
  #stage(size: 13pt)[
    #eq-alt((
      [$u(x)$], [$2/(1+0)+3/(1+1) cos x+4/(1+4) sin(2x)$],
      [$u(x)$], [$2+3/2 cos x+4/5 sin(2x)$],
      [$u(x)-u''(x)$], [$2+(3/2+3/2)cos x+(4/5+16/5)sin(2x)$],
    ))
  ]
  #pause
  #sanity[The recovered amplitudes are $2,3,4$. Both endpoint conditions hold.]
]

#frame("smooth")[
  #prompt[For $L=pi$, each amplitude is multiplied by $1/(1+n^2)$.]
  #plot("05-periodic-operator-filter", height: 42mm)
  #sanity[The mean stays fixed. Higher frequencies are reduced more.]
]

#frame("general")[
  #prompt[Recall L7: $cal(L)[y]=(p y')'+q y=-lambda r y$.]
  #stage(size: 12pt, height: 30mm)[
    #eq-alt((
      [$c_n$], [$(⟨ f,y_n ⟩_r)/(⟨ y_n,y_n ⟩_r)$],
      [$c_n$], [$(integral_a^b f(x)overline(y_n(x))r(x) dif x)/(integral_a^b abs(y_n(x))^2 r(x) dif x)$],
    ))
  ]
  #pause
  #text(fill: colors.structure)[Different eigenfunctions. The same coordinate rule.]
  $ norm(f-sum_(n=1)^N c_n y_n)_r arrow.r 0 quad (N arrow.r oo). $
  #sanity[For $f in L_r^2([a,b])$, use a complete orthogonal eigenbasis.]
]

#frame("log")[
  #prompt[Recall $x^2y''+x y'+lambda y=0$, $quad y(1)=y(2)=0$.]
  $ y_n(x)=sin((n pi ln x)/(ln 2)), quad r(x)=1/x, quad n >= 1. $
  #stage(size: 12pt, height: 26mm)[
    #eq-alt((
      [$c_n$], [$(integral_1^2 f(x)y_n(x) (dif x)/x)/(integral_1^2 y_n(x)^2 (dif x)/x)$],
      [$c_n$], [$2/(ln 2) integral_1^2 f(x)sin((n pi ln x)/(ln 2)) (dif x)/x$],
    ))
  ]
  #pause
  #sanity[$t=ln x$ gives $dif t=(dif x)/x$. The weight is the change of variable.]
]

#frame("heat")[
  #prompt[For $kappa>0$, $u_t=kappa u_(x x)$. Try $u(x,t)=A_n(t)phi_n(x)$.]
  #stage(size: 13pt)[
    #eq-alt((
      [$A_n'(t)phi_n(x)$], [$kappa A_n(t)phi_n''(x)$],
      [$A_n'(t)$], [$-kappa lambda_n A_n(t)$],
      [$A_n(t)$], [$A_n(0)e^(-kappa lambda_n t)$],
    ))
  ]
  #pause
  #sanity[Frequency $3$ has nine times the decay rate of frequency $1$.]
]

#frame("exit")[
  #prompt[$L=pi$, $quad f(x)=1+2 cos(3x)$. Predict before revealing.]
  #v(3mm)
  Nonzero real coefficients?
  #pause
  $ a_0=1, quad a_3=2. $
  #pause
  Nonzero complex coefficients?
  #pause
  $ C_0=1, quad C_3=C_(-3)=1. $
  #pause
  Solution of $u-u''=f$?
  #pause
  $ u(x)=1+1/5 cos(3x). $
]

#frame("map")[
  #v(5mm)
  #text(size: 14pt, fill: colors.structure)[Boundary conditions select the modes.]
  #pause
  #v(6mm)
  #text(size: 14pt, fill: colors.structure)[Inner products measure the amounts.]
  #pause
  #v(6mm)
  #text(size: 14pt, fill: colors.structure)[Operators act one mode at a time.]
]

#if show-extensions [
= Optional extensions

#frame("history", handout-only: true)[
  #prompt[The lecture follows what we know now.]
  #v(4mm)
  #text(size: 13pt)[Fourier’s heat problem (1822)]
  #v(3mm)
  #text(fill: colors.structure)[Trigonometric expansions]
  #v(3mm)
  #text(size: 13pt)[Sturm–Liouville expansions (1837)]
  #v(7mm)
  #sanity[Our SL-first order is a modern reconstruction, not the historical chronology.]
]

#frame("rigor", handout-only: true)[
  #prompt[Assume $f$ is $C^2$ and $2L$-periodic. Here $n != 0$.]
  #stage(size: 11.5pt, height: 28mm)[
    #eq-alt((
      [$C_n$], [$1/(2L) integral_(-L)^L f(x)e^(-i n omega_0 x) dif x$],
      [$C_n$], [$1/(i n omega_0) 1/(2L) integral_(-L)^L f'(x)e^(-i n omega_0 x) dif x$],
      [$C_n$], [$1/(i n omega_0)^2 1/(2L) integral_(-L)^L f''(x)e^(-i n omega_0 x) dif x$],
    ))
  ]
  #pause
  $ C_n=O(n^(-2)), quad D_n=O(n^(-4)), quad n^2D_n=O(n^(-2)). $
  #sanity[The series for $u,u',u''$ converge absolutely and uniformly.]
]

#frame("sheet", handout-only: true)[
  #set text(size: 10pt)
  $ omega_0=pi/L, quad a_0=C_0, quad n>=1 " for " a_n,b_n. $
  $ a_0 &= 1/(2L) integral_(-L)^L f(x) dif x, \
    a_n &= 1/L integral_(-L)^L f(x)cos(n omega_0 x) dif x, \
    b_n &= 1/L integral_(-L)^L f(x)sin(n omega_0 x) dif x. $
  $ C_n=1/(2L) integral_(-L)^L f(x)e^(-i n omega_0 x) dif x. $
  #sanity[For real $f$ and $n >= 1$: $C_n=(a_n-i b_n)/2$, $C_(-n)=overline(C_n)$.]
]

#frame("half", handout-only: true)[
  #prompt[For $-y''=lambda y$ on $[0,L]$, change the boundary conditions.]
  #v(3mm)
  #grid(columns: (1fr, 1fr), gutter: 6mm,
    [
      #text(fill: colors.structure)[Zero endpoint values]
      $ y(0)=y(L)=0 $
      $ sin(n pi x/L), quad n >= 1 $
      #pause
      Odd extension → sine series.
    ],
    [
      #text(fill: colors.structure)[Zero endpoint slopes]
      $ y'(0)=y'(L)=0 $
      $ 1, quad cos(n pi x/L), quad n >= 1 $
      #pause
      Even extension → cosine series.
    ],
  )
  #v(5mm)
  #sanity[The same half-range data has two different periodic extensions.]
]

#frame("transform", handout-only: true)[
  #prompt[Periodize an integrable $f$ supported inside one full period $T$.]
  #plot("07-fourier-transform-preview", height: 27mm)
  #pause
  #set text(size: 9pt)
  $ hat(f)(omega)=integral_(-oo)^oo f(x)e^(-i omega x) dif x, quad omega_n=(2pi n)/T. $
  $ C_n=1/T hat(f)(omega_n)=(Delta omega)/(2pi)hat(f)(omega_n). $
  #sanity[$Delta omega=2pi/T$. The Riemann-sum limit needs a theorem.]
]

#frame("laplace", handout-only: true)[
  #prompt[Recall the one-sided Laplace transform, with $s=sigma+i omega$.]
  #stage(size: 12pt)[
    #eq-alt((
      [$cal(L){f}(sigma+i omega)$], [$integral_0^oo f(t)e^(-(sigma+i omega)t) dif t$],
      [$cal(L){f}(sigma+i omega)$], [$integral_0^oo f(t)e^(-sigma t)e^(-i omega t) dif t$],
    ))
  ]
  #pause
  #text(fill: colors.structure)[Real part: growth or decay. Imaginary part: rotation.]
  #sanity[Set $sigma=0$ only when the corresponding integral converges.]
]
] // End handout-only extensions. References remain in every view.

= References

#frame("readings")[
  #ref-list(("H43", "T112", "C3", "S19"))
]

#frame("refs_sl")[
  #ref-list(("H62", "T111", "T113", "T132"))
]

#frame("refs_course")[
  #ref-list(("L7", "V21", "H24", "C1"))
]

#frame("refs_extensions")[
  #ref-list(("O24", "FT09", "LP08"))
]

#frame("refs_history")[
  #ref-list(("H1822", "HIST37"))
]

#frame("teaching_refs")[
  #ref-list(("F14", "C04", "SB98"))
  #v(2mm)
  #text(size: 7pt)[Native SCL Beamer + Touying overlays. Original, reproducible notebook figures.]
]
