// TEACHING GUIDE — rendered in the Pandoc lecturer annotations.
// Student slides deliberately contain fewer words. Keep explanations here.
// Each entry contains a question before the reveal, a sanity check, and a
// transition. The minutes form a suggested 90-minute core; appendix = 0.
// Sources are resolved in references.typ and described in REFERENCES.md.

#let note(title, minutes, goal: [], say: [], ask: [], check: [],
  transition: [], refs: (), states: ()) = (
  title: title, minutes: minutes, goal: goal, say: say, ask: ask,
  check: check, transition: transition, refs: refs, states: states,
)

#let notes = (
  start: note("Fourier series", 1,
    goal: [Discover the coefficients before naming the series.],
    say: [We already know how a boundary condition selects eigenfunctions.
      Today we ask how much of each eigenfunction is present in a given
      function. The same answer will solve a new boundary-value problem.
      Prerequisites: trigonometry, integration, complex numbers, inner
      products, the exponential power series, and L7 eigenvalue problems.
      No complex analysis is assumed.],
    ask: [What does an inner product measure for two vectors?],
    check: [An orthogonal coordinate is an inner product divided by the
      squared length of the basis vector. Students should retrieve this
      before seeing its function analogue.],
    transition: [Put the previous eigenvalue problem back on the board.],
    refs: ("L7", "H43", "H24")),

  recall: note("We know the modes. What is missing?", 3,
    goal: [Connect the new problem with the previous lecture.],
    say: [Recall the equation $y'' + lambda y = 0$. For an eigenfunction,
      taking two derivatives changes only its scale. Now prescribe a
      function $f$ and ask for $u$ satisfying $u-u''=f$, with periodic
      endpoint conditions. This is a new inhomogeneous problem. A sum of
      eigenfunctions with different eigenvalues does not solve one fixed
      eigenvalue equation. It can represent a general forcing function.],
    ask: [If $f$ were one eigenfunction, would the differential equation
      still be difficult? Give 20 seconds before the reveal.],
    check: [The prescribed function is $f$; the unknown is $u$. The
      eigenfunctions will be coordinates for both.],
    transition: [First fix the interval and the meaning of periodic.],
    refs: ("L7", "T111", "H43")),

  seam: note("Join the two ends", 2,
    goal: [Make the period and both boundary conditions explicit.],
    say: [In L7, $L$ denoted the full period on $[0,L]$. Here we follow the
      supplied Fourier lectures: the interval is $[-L,L]$, so the full
      period is $2L$. The value and the slope must match at the seam.
      Throughout, $omega_0=pi/L$. The coordinate $theta=omega_0 x$ runs
      from $-pi$ to $pi$. State this change once and keep it consistent.],
    ask: [Would matching only the endpoint values make the derivative
      periodic as well? Sketch a counterexample with unequal slopes.],
    check: [Both endpoint conditions are needed to cancel the integration
      by parts boundary term. A constant satisfies both conditions.],
    transition: [Try the forcing that our previous lecture has already
      made easy.],
    refs: ("L7", "V21", "H24", "T112")),

  one_mode: note("One mode turns calculus into algebra", 3,
    goal: [Create a concrete reason to seek eigenfunction coordinates.],
    say: [Suppose $f=A y_n$ and $-y_n''=lambda_n y_n$. Try the same shape
      $u=D y_n$. Reveal one aligned row per click:
      substitute, use the eigenvalue equation, factor, then solve for $D$.
      This is a trial that succeeds because differentiation preserves the
      shape of an eigenfunction. We will justify $lambda_n >= 0$ next.],
    ask: [Predict the multiplier before advancing to the last state.],
    check: [For $lambda_n=0$, the constant forcing passes through unchanged.
      For positive $lambda_n$, its amplitude is reduced. Substitution
      gives $(1+lambda_n)A/(1+lambda_n)=A$.],
    transition: [Which modes can a periodic boundary condition allow?],
    refs: ("L7", "H43"),
    states: ([Substitute the trial.], [Use $y_n''=-lambda_n y_n$.],
      [Factor the common shape.], [Match scalar amplitudes.], [Solve the scalar equation.])),

  energy: note("A quick check on the eigenvalues", 2,
    goal: [Exclude imaginary frequencies without solving three ODE cases.],
    say: [For a real nonzero periodic eigenfunction, multiply
      $-y''=lambda y$ by $y$ and integrate. Integration by parts produces
      $-[y y']_(-L)^L$, which is zero because both endpoint values match.
      The remaining integral is nonnegative. Thus $lambda >= 0$.
      If $lambda=0$, the integral of $(y')^2$ vanishes, so $y$ is constant.
      Complex modes give the same argument with a conjugate, introduced
      later.],
    ask: [Which boundary condition cancels which part of $[y y']$?],
    check: [$integral y^2 >0$ for a nonzero eigenfunction. Division by
      this number is legitimate.],
    transition: [For positive eigenvalues we know sine and cosine. A
      complex coordinate will package them together.],
    refs: ("L7", "T111", "H43"),
    states: ([Use the differential equation.], [Integrate by parts.],
      [Cancel the endpoint term.])),

  turn: note("What does multiplication by i do?", 2,
    goal: [Make complex notation a familiar geometric operation.],
    say: [Write $z=a+i b$. Then $i z=-b+i a$: the point $(a,b)$ becomes
      $(-b,a)$, a quarter-turn without a change of length. Follow the
      powers $1,i,-1,-i,1$. The complex plane lets one number carry two
      real coordinates. Nothing here requires differentiation with
      respect to a complex variable. Our independent variable stays real.],
    ask: [Where does a clockwise quarter-turn send $1$? What multiplier
      produces it?],
    check: [$i^2=-1$ is a half-turn; four quarter-turns return to $1$.
      This cyclic pattern is exactly what will sort the power series.],
    transition: [Recall the exponential series from L7. Substitute
      $i theta$ and look for the familiar even and odd terms.],
    refs: ("L7", "O24", "S19")),

  euler: note("The exponential already contains trigonometry", 4,
    goal: [Derive Euler's formula from the known power series.],
    say: [Define $e^z$ by its absolutely convergent power series. For
      $z=i theta$, successive powers of $i$ cycle. On the second click,
      simplify only those powers. On the next click, collect the real
      even terms and the imaginary odd terms. Absolute convergence
      permits this regrouping. Recognize the cosine and sine series from
      L7; do not claim an arbitrary smooth function equals its Taylor
      series. Euler's formula has now been obtained, not assumed.],
    ask: [Before grouping: which powers contribute to the real part?
      Which to the imaginary part?],
    check: [At $theta=0$, both sides are $1$. At $theta=pi/2$, both are
      $i$. Their squared modulus is $cos^2 theta+sin^2 theta=1$.],
    transition: [Use the same exponential to describe a rotating mode.],
    refs: ("L7", "O24", "S19"),
    states: ([Substitute $i theta$.], [Simplify the powers of $i$.],
      [Group even and odd powers.], [Recognize cosine and sine.])),

  rotate: note("One exponential, two real coordinates", 2,
    goal: [Connect rotation, sign of frequency, and the eigenvalue.],
    say: [For real $x$ and nonzero $k$, $phi(x)=e^(i k x)$ traces the unit circle. If $k=0$, it stays at $1$. Its real
      and imaginary coordinates are cosine and sine. Positive $k$ rotates
      counterclockwise as $x$ increases; negative $k$ rotates clockwise.
      Differentiate using the exponential series or the sine/cosine
      identity. The first derivative multiplies by $i k$; the second by
      $(i k)^2=-k^2$. Thus it is an eigenfunction of $-(dif^2)/(dif x^2)$.],
    ask: [Does changing $k$ to $-k$ change the eigenvalue?],
    check: [The eigenvalue is $k^2$, so the two directions have the same
      eigenvalue. Their imaginary parts have opposite signs.],
    transition: [The boundary condition will select which rotations close.],
    refs: ("O24", "C3", "S19"),
    states: ([Differentiate once.], [Differentiate again.],
      [Read off the eigenvalue.])),

  quantize: note("Periodic means a whole number of turns", 3,
    goal: [Derive the discrete frequencies from the boundary condition.],
    say: [The condition $phi(L)=phi(-L)$ gives
      $e^(i k L)=e^(-i k L)$. Divide by the nonzero exponential to obtain
      $e^(2i k L)=1$. A unit-circle point is back at $1$ after $2pi n$
      radians. Therefore $k=n pi/L=n omega_0$, with integer $n$.
      Its derivative is $i k phi$, so it also matches at the endpoints.
      The derivative condition was essential for the full operator
      domain even though it follows automatically for these trials.],
    ask: [Why are the admissible frequencies discrete? Could
      $n=1/2$ close after one period?],
    check: [Substitute $x=L,-L$: both values are $(-1)^n$.
      $n=0$ gives the constant mode.],
    transition: [The old real eigenfunctions and the new complex modes
      describe the same spaces.],
    refs: ("L7", "T111", "C3", "S19"),
    states: ([Match the endpoints.], [Divide by a nonzero exponential.],
      [Count full turns.], [Solve for the frequency.])),

  modes: note("The same eigenfunctions, another coordinate system", 2,
    goal: [Connect the complex basis to the previous sine/cosine solutions.],
    say: [Use $phi_n=e^(i n omega_0 x)$ for all integers. The picture uses
      $L=pi$, so the plotted eigenvalues are $n^2$. The constant is
      indexed by zero. For positive $n$, $phi_n$ and $phi_(-n)$ span the
      same complex two-dimensional space as cosine and sine. If we insist
      on real-valued functions, cosine and sine form the corresponding
      real two-dimensional eigenspace. Periodic positive eigenvalues
      have multiplicity two; do not import the simple-eigenvalue theorem
      for separated boundary conditions.],
    ask: [Why do we need both directions of rotation to build a general
      real wave?],
    check: [The real and imaginary parts reproduce the L7 modes, with
      the new interval length $2L$.],
    transition: [Knowing the shapes is only half the problem. How do we
      measure the amount of each?],
    refs: ("L7", "T111", "C3")),

  average: note("Which rotation survives an average?", 3,
    goal: [Make orthogonality arise as cancellation over a complete period.],
    say: [Begin with a single mode. Define its average over one full
      period. For nonzero integer $q$, integrate the exponential. The
      endpoint values agree, so the numerator is zero. Handle $q=0$
      separately: its value is always one, so its average is one. We must
      not divide by $q$ in that case. Geometrically, opposite points on
      complete turns cancel.],
    ask: [Predict the average of $1$, of $e^(i theta)$, and of
      $e^(2i theta)$ before evaluating anything.],
    check: [The factor $1/(2L)$ turns an integral into an average. Without
      it the constant mode has integral $2L$, not $1$.],
    transition: [Averaging selects the zero-frequency mode. Can we make a
      different mode become stationary?],
    refs: ("C3", "S19", "T112"),
    states: ([Integrate a nonzero mode.], [Evaluate at the endpoints.],
      [Use periodicity.])),

  freeze: note("Turn with the mode you want", 3,
    goal: [Understand the minus sign in the coefficient integral.],
    say: [To measure mode $m$, multiply by $e^(-i m omega_0 x)$. In this
      rotating coordinate system a mode $n$ has frequency $n-m$.
      The desired mode has frequency zero and stops rotating. Every
      other integer mode still makes whole turns and averages to zero.
      This distills Sanderson's freeze-and-average explanation using the
      eigenfunctions already found in class.],
    ask: [For $m=1$, what happens to frequencies $0,1,2$? Ask students
      to predict the three new frequencies before showing the diagram.],
    check: [The frequencies become $-1,0,1$ and the averages become
      $0,1,0$. The negative sign is necessary to freeze the target.],
    transition: [Apply this operation to a finite sum so every algebraic
      step is justified immediately.],
    refs: ("S19", "C3")),

  isolate: note("One coefficient remains", 5,
    goal: [Derive extraction for a finite sum before taking any limits.],
    say: [Let $F_N=sum_(n=-N)^N C_n phi_n$. Multiply by the counterrotation,
      average, distribute the finite sum through the integral, and use
      the previous cancellation result. Only $n=m$ remains when
      $abs(m) <= N$. For a mode outside this finite range the result is
      zero. The integral is forced on us by the operation we wanted. It
      is not a formula introduced without motivation.],
    ask: [At which index does the exponent vanish? Wait for the class
      to identify $n=m$ before the last click.],
    check: [Set $F_N=phi_k$: the extracted coefficient is $1$ when
      $m=k$ and $0$ otherwise. Linearity then handles every finite sum.],
    transition: [For a general function, use exactly this measurement
      to choose its coordinates.],
    refs: ("S19", "C3", "H43"),
    states: ([Define the measurement $I_m$.], [Substitute the finite sum.], [Move the finite sum outside.],
      [Use cancellation.], [Keep the single surviving term.])),

  coefficient: note("The integral is a coordinate", 3,
    goal: [Recover the familiar projection formula with the right norm.],
    say: [Extend the familiar real inner product to complex functions by
      conjugating the second factor. Then $⟨ phi_n,phi_n ⟩$
      is the integral of $abs(phi_n)^2$, namely $2L$. The opposite
      rotation in the extraction integral is exactly this conjugate.
      For any square-integrable $f$, define $C_n$ by projection and form
      the finite partial sum $S_N$. We have not yet claimed that the
      infinite series equals $f$.],
    ask: [What would $integral phi_1^2$ give without the conjugate?
      Why would that be a bad squared length?],
    check: [Without conjugation that integral is zero. With conjugation
      the integrand is identically one, giving a positive squared norm.],
    transition: [Why should these coordinates be the best choice?],
    refs: ("H24", "C3", "H43"),
    states: ([Recall vector projection.], [Insert the complex inner
      product and the mode norm.])),

  best: note("The residual is perpendicular to every chosen mode", 3,
    goal: [Give a finite-dimensional justification for the coefficients.],
    say: [Let $V_N$ be the span of the chosen modes. The coefficients give
      $⟨f-S_N,phi_m⟩=⟨f,phi_m⟩-2L C_m=0$ for every chosen mode;
      hence $r=f-S_N$ is orthogonal to every element of $V_N$. Compare with any
      other $v$ in $V_N$. The two pieces $r$ and $S_N-v$ are orthogonal,
      so Pythagoras separates their squared lengths. The second squared
      length is nonnegative and vanishes only for $v=S_N$. Thus $S_N$ is
      the unique least-squares approximation from these modes. This is
      a statement about a finite sum, requiring no convergence theorem.],
    ask: [Which part of the error can a different choice of coefficients
      remove?],
    check: [If $f$ already belongs to $V_N$, then its residual is zero and
      the reconstruction is exact.],
    transition: [Orthogonality proves the best finite fit. Completeness
      is the additional ingredient needed for infinitely many modes.],
    refs: ("C3", "H43", "H24"),
    states: ([Split the error.], [Apply Pythagoras.], [Take the minimum.])),

  limit: note("What permits an infinite expansion?", 3,
    goal: [Separate coefficient calculation from a convergence theorem.],
    say: [State the theorem only after students understand what it must
      guarantee. The trigonometric modes are complete in
      $L^2([-L,L])$, so $norm(f-S_N)_2$ tends to zero for every
      square-integrable $f$. This is mean-square convergence, not a
      claim about every point. For a piecewise continuously
      differentiable periodic function, the ordinary partial sums
      converge at each point to the average of the one-sided limits.
      At continuous points this is $f(x)$. The tent example is covered.
      The smooth forcing used in the BVP is covered as well.],
    ask: [Does orthogonality by itself prove completeness? Think of
      keeping only one coordinate axis in the plane.],
    check: [A value assigned at one jump does not affect an integral
      coefficient. The theorem must therefore not promise that arbitrary
      assigned value.],
    transition: [Our coordinates are complex. Why is a real function
      still real when we reconstruct it?],
    refs: ("T112", "C1", "C3", "H62")),

  real: note("A real function has conjugate coefficients", 2,
    goal: [Explain paired frequencies and avoid treating them as redundant.],
    say: [Conjugate the coefficient integral. Because $f$ is real, it stays
      unchanged. Conjugating $e^(-i n omega_0 x)$ changes the sign in
      the exponent, giving $C_(-n)$. In particular, $C_0$ is real. The
      positive and negative frequencies are linked; together they
      reconstruct a real signal. For a genuinely complex-valued function,
      this relation need not hold.],
    ask: [If $C_2=-2i$, what must $C_(-2)$ be?],
    check: [The answer is $2i$. Their contributions will combine to
      $4 sin(2 omega_0 x)$, which is real.],
    transition: [Pair one positive and negative frequency explicitly.],
    refs: ("C3", "S19"),
    states: ([Conjugate the coefficient.], [Use that $f$ is real.],
      [Recognize the negative index.])),

  geometry: note("A coefficient sets a radius and starting angle", 2,
    goal: [Give a geometric meaning to the complex coordinates.],
    say: [For a nonzero coefficient, choose polar coordinates
      $C_n=R_n e^(i alpha_n)$, where $R_n=abs(C_n)$ and $alpha_n$ is its
      angle at $x=0$. Multiplying by the mode adds $n omega_0 x$ to
      that angle. The coefficient controls radius and initial phase;
      the index controls speed and direction. A zero coefficient
      contributes no vector, so its angle is irrelevant. The picture
      shows $C_1=C_(-1)=1/2$. The vertical components cancel and the
      horizontal components add.],
    ask: [If we double the magnitude of $C_n$, what changes? If we
      rotate $C_n$ without changing its magnitude, what changes?],
    check: [The first change doubles the radius. The second changes
      the starting angle, not the frequency. At $theta=pi/3$, the
      illustrated pair sums to $cos(theta)=1/2$.],
    transition: [Pair general conjugate coefficients algebraically.],
    refs: ("O24", "S19", "C3"),
    states: ([Write the coefficient in polar form.], [Add the angles.])),

  pair: note("Two rotations become one real oscillation", 3,
    goal: [Derive the cosine/sine coefficients instead of introducing them.],
    say: [For positive $n$, write $C_n=(a_n-i b_n)/2$. Its conjugate is
      $(a_n+i b_n)/2$. Substitute both, collect the coefficient of $a_n$
      and the coefficient of $b_n$, and use Euler's identity. The sign
      in $-i b_n$ is required by the chosen negative analysis exponent.
      A conjugate pair with zero imaginary coefficient gives cosine;
      a purely imaginary coefficient pair gives sine.],
    ask: [Why must the factor $1/2$ appear when a real cosine is split
      between two directions?],
    check: [For $cos theta$, $C_1=C_(-1)=1/2$. For $sin theta$,
      $C_1=-i/2$ and $C_(-1)=i/2$.],
    transition: [Now collect all pairs and give the expansion its name.],
    refs: ("C3", "T112", "S19"),
    states: ([Insert the conjugate pair.], [Collect real coefficients.],
      [Recognize cosine and sine.])),

  series: note("Fourier series", 2,
    goal: [Formalize the representation after deriving its mechanism.],
    say: [This is the real Fourier series in the supplied CS138
      convention. The constant is $a_0$, not $a_0/2$. Thus $a_0=C_0$ is
      the mean. For positive indices, $a_n=2 op("Re") C_n$ and
      $b_n=-2 op("Im") C_n$. The slide displays the finite partial sum
      $S_N$; equality of its limit with $f$ depends on the convergence
      statement just discussed. For the continuous piecewise smooth
      examples, equality holds everywhere, with periodic endpoints
      understood.],
    ask: [Which term records the average level? Which terms record
      oscillations about that level?],
    check: [A constant $f=A$ gives only $a_0=A$. Check this before
      memorizing any factors of two.],
    transition: [Derive the familiar real integrals from the one complex
      coefficient integral.],
    refs: ("V21", "H24", "T112", "C3")),

  formulas: note("The coefficients follow from projection", 3,
    goal: [Make the different normalization factors inevitable.],
    say: [Project onto $1$, cosine, and sine. Their squared norms on
      $[-L,L]$ are $2L,L,L$, respectively. This gives the three formulas
      in successive states. The last state alone is not a formula sheet;
      the notes and appendix retain all three. Students should explain
      the factor of two using the basis lengths rather than memorizing
      an unexplained convention. For real functions the formulas also
      follow by taking real and imaginary parts of $C_n$.],
    ask: [Why is the denominator $2L$ for the mean, but $L$ for the
      nonconstant sine and cosine coefficients?],
    check: [For $f=cos(m pi x/L)$, orthogonality gives $a_m=1$ and every
      other coefficient zero. For $f=1$, it gives $a_0=1$.],
    transition: [Use symmetry to predict coefficients before doing an
      integral.],
    refs: ("T112", "H24", "C3"),
    states: ([Project onto the constant.], [Project onto cosine.],
      [Project onto sine.])),

  tent: note("Can smooth waves build a corner?", 4,
    goal: [Move beyond a sum that is already written in Fourier form.],
    say: [Use the periodic tent $f(x)=1-abs(x)/L$ on $[-L,L]$. Its
      endpoint values agree and it is continuous, but it has corners.
      First predict: the mean is the triangle's area divided by the
      period, namely $1/2$. The function is even, so every sine
      coefficient is zero. Only then compute the cosine coefficients.
      This is a representation example under the piecewise smooth
      convergence theorem; it is not the $C^2$ forcing assumed in the
      simple classical BVP justification.],
    ask: [Predict the mean and all $b_n$ without integrating. Pair
      discussion: 30 seconds, then justify using area and parity.],
    check: [Triangle area is $L$; divide by $2L$. An even function times
      an odd sine is odd, so its integral on a symmetric interval is zero.],
    transition: [One integration by parts decides which cosine modes
      remain.],
    refs: ("T112", "C1", "H24")),

  tent_coeff: note("The corner selects the odd cosine modes", 5,
    goal: [Carry out one short, checkable coefficient computation.],
    say: [Set $k=n pi/L$ with $n >= 1$. Evenness halves the integration
      interval and doubles the integral. Integrate by parts using
      $u=1-x/L$ and $dif v=cos(k x)dif x$. The boundary product is zero:
      sine vanishes at zero and the linear factor vanishes at $L$.
      The remaining sine integral gives $1-cos(k L)$. Now use
      $cos(n pi)=(-1)^n$. Even modes vanish; odd modes have
      $a_n=4/(pi^2 n^2)$. Keep the same left side while simplifying.],
    ask: [Before the last click: what does $1-(-1)^n$ do for even and
      odd integers?],
    check: [For $n=1$ the coefficient is positive. The leading cosine
      therefore raises the center and lowers the endpoints, matching
      the tent's shape.],
    transition: [Look at the resulting partial sums; check the shape
      against the signs and decay of the coefficients.],
    refs: ("T112", "C1"),
    states: ([Use evenness.], [Integrate by parts.],
      [Evaluate the sine integral.], [Insert $k=n pi/L$.])),

  tent_sum: note("More modes resolve the corner", 2,
    goal: [Connect coefficient decay to the quality of approximation.],
    say: [The partial sums shown use maximum indices $N=1,3,9$; only odd
      indices contribute. Ask students to identify what improves and
      what remains rounded. Coefficients decay as $1/n^2$, so the
      infinite series is absolutely and uniformly convergent. A
      continuous limit can still have a corner. Do not differentiate
      its series twice term by term without a separate justification.
      The notebook recomputes every plotted partial sum from the stated
      coefficients.],
    ask: [At $x=0$, what should the total of the constant and cosine
      coefficients approach? At $x=L$?],
    check: [The limits are $1$ and $0$. The left and right limits coincide everywhere, so their
      average equals $f(x)$, including at the corners.],
    transition: [Return to the boundary-value problem with these
      coordinates now available.],
    refs: ("T112", "C1")),

  filter: note("Solve one scalar equation per mode", 4,
    goal: [Complete the original discovery problem.],
    say: [For a finite forcing sum, let its coefficient be $C_n$ and
      the solution coefficient be $D_n$. Differentiation changes
      $phi_n$ by $-lambda_n$, so the equation becomes
      $(1+lambda_n)D_n=C_n$. Divide by the positive factor. This is
      exact for every finite sum. For a $C^2$, $2L$-periodic forcing,
      the coefficient decay justifies the limiting solution and its
      first two derivatives; details are in the appendix. A sum over
      different eigenvalues solves this forced equation, not one
      homogeneous eigenvalue problem.],
    ask: [Which coefficients shrink most? Why does the mean stay the
      same?],
    check: [$lambda_n=(n pi/L)^2 >= 0$. The denominator never vanishes;
      $D_0=C_0$. Real conjugate pairs remain conjugate after division.],
    transition: [Verify the result on a forcing with only three real
      modes, so the whole calculation can be checked by substitution.],
    refs: ("L7", "H43", "C3"),
    states: ([Apply the operator to one mode.], [Use its eigenvalue.],
      [Match coefficients.], [Solve for the new amplitude.])),

  example: note("A solution you can check directly", 4,
    goal: [Make the operator calculation concrete with small numbers.],
    say: [Choose $L=pi$, hence $omega_0=1$. For
      $f=2+3 cos x+4 sin(2x)$ the eigenvalues are $0,1,4$.
      Divide the three amplitudes by $1,2,5$ to obtain
      $u=2+3/2 cos x+4/5 sin(2x)$. Then differentiate twice and subtract.
      Ask students to do the last coefficient check themselves. Since
      the functions are $2pi$-periodic, both endpoint conditions hold.],
    ask: [Why does the frequency-two sine get divided by five rather
      than by three?],
    check: [Two derivatives multiply it by $-4$; the identity term adds
      one. The recovered sine amplitude is $4/5+16/5=4$.],
    transition: [The same coefficient rule acts on a function with many
      modes. The effect becomes visible as smoothing.],
    refs: ("H43", "L7"),
    states: ([Divide each amplitude by $1+lambda_n$.],
      [Simplify the three fractions.], [Substitute into $u-u''$.])),

  smooth: note("High frequencies are reduced more", 2,
    goal: [Interpret the spectral solution rather than stopping at algebra.],
    say: [For $L=pi$, the multiplier is $1/(1+n^2)$. Apply it to the
      tent's cosine coefficients and compare the curves. The mean
      stays $1/2$ while the rapid spatial variation is reduced. The
      plotted finite sums are exact solutions for their corresponding
      finite forcing sums. The tent example also admits a classical
      solution by standard ODE theory, but the simple $C^2$ proof in
      the appendix is stated separately to avoid silently changing
      assumptions.],
    ask: [What would happen if the forcing were a constant? If it had
      only a very high frequency?],
    check: [The multiplier is positive, at most one, and equals one
      only at frequency zero.],
    transition: [What changes if a different boundary-value problem
      gives eigenfunctions that are not sines and cosines?],
    refs: ("H43", "H62")),

  general: note("Fourier coordinates go beyond trigonometry", 3,
    goal: [Recover generalized Fourier expansion in the L7 notation.],
    say: [Return to the L7 convention
      $cal(L)[y]=(p y')'+q y=-lambda r y$.
      Under the appropriate self-adjoint boundary conditions,
      eigenfunctions belonging to distinct eigenvalues are orthogonal
      in the weight $r$. For a regular problem with $p>0,r>0$ and
      suitable real coefficients, the complete orthogonal eigenbasis
      gives a weighted projection expansion. Within a repeated
      eigenspace choose an orthogonal basis. The coefficient rule is
      unchanged: inner product divided by squared norm.],
    ask: [Which part of the coefficient formula changes when the
      eigenfunctions or the weight change?],
    check: [The periodic trigonometric case is $p=r=1,q=0$.
      The weight belongs in both numerator and denominator.],
    transition: [Use the logarithmic example already seen in L7 to
      make “beyond trigonometry” concrete.],
    refs: ("L7", "H62", "T132", "H24")),

  log: note("The old logarithmic example fits the same rule", 3,
    goal: [Generalize using a familiar example rather than a new special function.],
    say: [Recall $x^2y''+x y'+lambda y=0$ on $[1,2]$, with zero
      endpoint values. Dividing by $x$ gives
      $(x y')'+lambda y/x=0$, so $p=x,r=1/x,q=0$.
      For $n=1,2,dots$, the change $t=ln x$ gives a sine problem
      on $[0,ln 2]$. Thus $y_n=sin((n pi ln x)/(ln 2))$.
      The measure $(dif x)/x$ becomes $dif t$, so the weight is not an
      arbitrary decoration. Its squared norm is $(ln 2)/2$.],
    ask: [What substitution makes the weighted inner product an
      ordinary sine inner product?],
    check: [The eigenfunction is zero at both endpoints, and
      $integral_1^2 y_n^2 (dif x)/x=ln(2)/2$.],
    transition: [The same separation of shape and amplitude explains
      why these expansions are useful for PDEs.],
    refs: ("L7", "T132", "H62"),
    states: ([Use weighted projection.], [Insert the known squared norm.])),

  heat: note("A PDE becomes an ODE for each amplitude", 2,
    goal: [Provide a short, accurate bridge to the next topic.],
    say: [Preview the periodic heat equation $u_t=kappa u_(x x)$, with
      $kappa>0$. Try a single spatial eigenfunction with a time-varying
      amplitude $A_n(t)$. The spatial derivatives are already known;
      the PDE reduces to $A_n'=-kappa lambda_n A_n$. Solve this scalar
      ODE to get exponential decay. Different modes decay at different
      rates, and the mean survives. This is a preview, not a full
      existence proof for arbitrary initial data.],
    ask: [Which disappears faster: a mode with frequency one or three?
      By what factor are their decay rates different?],
    check: [The rates differ by nine. The exponent is nonpositive,
      consistent with heat smoothing rather than amplifying variation.],
    transition: [Ask students to use the whole chain once without
      looking back at the coefficient formulas.],
    refs: ("H43", "H62", "S19"),
    states: ([Separate one spatial shape and amplitude.],
      [Use the spatial eigenvalue.], [Solve the amplitude ODE.])),

  exit: note("Can you use the whole chain?", 4,
    goal: [Retrieve the mechanism independently before the answer reveal.],
    say: [Use $L=pi$ and $f=1+2 cos(3x)$. Give 60 seconds individually,
      then 30 seconds to compare. Ask for the nonzero real coefficients,
      the nonzero complex coefficients, and the solution of $u-u''=f$.
      Reveal one answer at a time. Real: $a_0=1,a_3=2$.
      Complex: $C_0=1,C_3=C_(-3)=1$.
      Solution: $u=1+1/5 cos(3x)$. Ask one student to explain the ten
      in the denominator before simplifying.],
    ask: [Where did the integer three enter the eigenvalue? Where did
      the factor one-half enter the complex coefficients?],
    check: [$1/5+9/5=2$. The mean stays one; the sine coefficients are
      zero because the forcing is even.],
    transition: [Close the core lecture with the three decisions that
      made the problem simple. Optional slides follow.],
    refs: ("L7", "T112", "C3")),

  map: note("Boundary conditions. Coordinates. Simple operators.", 1,
    goal: [Leave students with a reusable sequence of decisions.],
    say: [Ask the class to supply each phrase before revealing it:
      boundary conditions select the modes; inner products measure
      the coefficients; the operator acts on each mode by a scalar.
      Fourier series are the periodic trigonometric instance of this
      broader eigenfunction strategy. The complex plane made the
      trigonometry and the coefficient integral easier to see.
      Stop here for the 90-minute core, or use selected appendix slides
      when the course schedule permits.],
    ask: [What new ingredient would we need for a different boundary
      condition?],
    check: [We would need its eigenfunctions and norms, plus a relevant
      completeness/convergence theorem. The projection idea remains.],
    transition: [Offer the reading list. The following slides are
      optional extensions and reference material.],
    refs: ("H43", "H62", "T132", "S19")),

  history: note("A modern reconstruction of an old discovery", 0,
    goal: [Motivate historically without reversing the actual chronology.],
    say: [This lecture deliberately reconstructs Fourier analysis using
      Sturm–Liouville theory that the class already knows. Fourier’s heat treatise was published in 1822; the cited joint
      Sturm–Liouville paper on eigenfunction series appeared in 1837. Sanderson's lesson
      follows heat flow into rotating complex exponentials. Our route
      starts from the periodic eigenvalue BVP, then uses his
      counterrotation-and-average insight to discover the coefficients.
      Do not describe this classroom order as Fourier's original proof.],
    ask: [What makes a heat profile difficult to evolve? What becomes
      easy when it is written as independent modes?],
    check: [A useful historical motivation does not require claiming
      that every later theorem was available to Fourier.],
    transition: [Use the appendix only for questions that arise.],
    refs: ("S19", "H1822", "HIST37")),

  rigor: note("Why the BVP series may be differentiated", 0,
    goal: [Supply the analytic justification that the core lecture postpones.],
    say: [Assume $f$ extends to a $C^2$, $2L$-periodic function on the real
      line. For $n != 0$, integrate the coefficient formula twice by
      parts; periodic $f,f'$ and matching exponential endpoints remove
      both boundary terms. Hence $C_n=O(n^(-2))$. The solution
      coefficients $D_n=C_n/(1+(n pi/L)^2)$ are $O(n^(-4))$.
      The series for $u,u',u''$ then converge absolutely and uniformly.
      Termwise differentiation is justified, the finite identities pass
      to the limit, and periodic endpoint conditions follow. For
      uniqueness, integrate $overline(w)(w-w'')=0$ for the difference of two
      solutions to obtain $integral(abs(w)^2+abs(w')^2)=0$.],
    ask: [Why does differentiating twice still leave a summable bound
      for the solution coefficients?],
    check: [$n^2 D_n=O(n^(-2))$, and $sum n^(-2)$ converges.
      This proof does not claim the tent itself is $C^2$.],
    transition: [Keep pointwise convergence and termwise differentiation
      as separate issues.],
    refs: ("T112", "C3", "H62")),

  sheet: note("Coefficient reference: our convention", 0,
    goal: [Provide a complete formula sheet even when overlays collapse.],
    say: [All formulas use full period $2L$ and $omega_0=pi/L$.
      Our constant $a_0$ is the mean. Sources that write the real series
      with $a_0/2$ assign twice our value to the symbol $a_0$; their
      positive-index coefficients are unchanged. The complex analysis
      exponent is negative and the synthesis exponent positive.
      For complex-valued $f$, do not impose conjugate symmetry.],
    ask: [Test all normalization factors with $f=1$, $cos(omega_0 x)$,
      and $sin(omega_0 x)$.],
    check: [The three tests give respectively $a_0=1$, $a_1=1$, and
      $b_1=1$, with the other real coefficients zero.],
    transition: [An even or odd extension selects the cosine or sine
      family for half-range data.],
    refs: ("T112", "T113", "C3", "V21", "H24")),

  half: note("Change the boundary conditions, change the modes", 0,
    goal: [Connect full-period, sine, and cosine expansions without conflating them.],
    say: [For $-y''=lambda y$ on $[0,L]$, homogeneous Dirichlet conditions give sine modes;
      homogeneous Neumann conditions give a constant and cosine modes.
      For a function specified only on $[0,L]$, odd extension to
      $[-L,L]$ gives the sine series; even extension gives the cosine
      series. These are two different extensions of the same half-range
      data. The initial function itself need not satisfy homogeneous
      endpoint values for an $L^2$ expansion. Pointwise boundary
      convergence and PDE compatibility require separate attention.],
    ask: [Why does odd symmetry force all cosine coefficients,
      including the mean, to vanish?],
    check: [The product of an odd function with an even cosine is odd.
      The sine and cosine frequencies are $n pi/L$ on this interval.],
    transition: [For nonperiodic data, the discrete frequencies become
      a continuous variable in a suitable limit.],
    refs: ("L7", "T113", "H24")),

  transform: note("A longer period gives more closely spaced frequencies", 0,
    goal: [Preview the Fourier transform with its normalization intact.],
    say: [Use a new letter $T$ for the full period in this appendix.
      For an integrable, compactly supported function placed in a sufficiently long
      period, $C_n=1/T hat(f)(omega_n)$, where
      $omega_n=2pi n/T$. Thus $C_n=(Delta omega)/(2pi) hat(f)(omega_n)$.
      The synthesis sum has the form of a Riemann sum with spacing
      $Delta omega=2pi/T$. As $T$ grows, the frequencies become dense.
      This motivates the inverse Fourier integral; a limit theorem is
      needed before asserting the passage for a given function. The
      notebook uses a compact triangular pulse whose transform is
      integrable. Plot $T C_n$, not $C_n$, against frequency.],
    ask: [When the period doubles, what happens to the frequency spacing?
      Why must the vertical scale of the coefficient samples change?],
    check: [$T C_n$ samples the same transform curve. Omitting the
      spacing factor would give the wrong inverse-transform scale.],
    transition: [The exponential kernel also explains the connection
      with the Laplace transform already encountered.],
    refs: ("FT09", "C3")),

  laplace: note("The same exponential carries growth and rotation", 0,
    goal: [Connect to prior Laplace knowledge with the correct convergence caveat.],
    say: [For $s=sigma+i omega$, the one-sided Laplace kernel is
      $e^(-s t)=e^(-sigma t)e^(-i omega t)$. The real part weights growth
      or decay; the imaginary part counterrotates. Setting $sigma=0$
      gives a one-sided Fourier integral only when it converges in the
      relevant sense. It is not automatically the two-sided Fourier
      transform of an arbitrary function. For a causal function extended
      by zero to negative times, the two integrals coincide when the
      imaginary axis lies in the convergence region.],
    ask: [Which part of $s$ controls the radius, and which part the angle?],
    check: [At $omega=0$ there is no rotation. At $sigma=0$ there is no
      exponential radial damping.],
    transition: [Use the reading list to continue with PDEs or transforms.],
    refs: ("LP08", "O24")),

  readings: note("Read next: the mathematical thread", 0,
    goal: [Give a short reading path tied to the lecture's questions.],
    say: [Read Herman's linear-algebra connection first, Trench's
      coefficient and convergence section second, and Chen's complex
      form third. Sanderson supplies the rotating-vector intuition.
      Then return to the general Sturm–Liouville chapter. The source
      file REFERENCES.md has precise links and the convention map.],
    ask: [Which question from today's lecture would you like the reading
      to answer more fully?],
    check: [Translate the constant term before comparing formulas
      between texts.],
    transition: [The final references document the teaching design and
      technical assets.],
    refs: ("H43", "T112", "C3", "S19", "H62", "T132")),

  refs_sl: note("References: eigenfunctions and expansions", 0,
    goal: [Connect each expansion theorem to its hypotheses.],
    say: [Use Trench §11.1 to revisit periodic eigenvalue problems and
      §11.3 for half-range extensions. Use Herman §6.2 and Trench §13.2
      for the weighted self-adjoint theory. Keep the simple spectrum of
      regular separated problems distinct from paired periodic eigenvalues.],
    ask: [What inner product and boundary conditions belong to this expansion?],
    check: [Include the weight in both projection integrals.],
    transition: [The next page identifies the course sources.],
    refs: ("H62", "T111", "T113", "T132")),

  refs_course: note("References: the supplied course material", 0,
    goal: [Record the notation sources and prerequisite lecture.],
    say: [L7 supplies the eigenvalue BVPs, logarithmic example, and
      power-series recall. The two CS138 Fourier decks supply the
      period 2L and mean a0 conventions. Chen supplies the complex
      formulation; REFERENCES.md explains the constant-term translation.
      The original supplied PDFs remain separate from this new lecture.],
    ask: [Map each piece to a previous topic: BVP, series, trigonometry,
      or projection.],
    check: [L7's full-period L becomes full-period 2L here.],
    transition: [The following sources support optional extensions.],
    refs: ("L7", "V21", "H24", "C1")),

  refs_extensions: note("References: exponentials and transforms", 0,
    goal: [Provide next readings without presupposing complex analysis.],
    say: [Orloff's Topic 4 derives Euler's formula using power series
      and elementary geometry. The MIT 6.003 handout develops the
      frequency-spacing route from a series to a transform. The MIT
      2.161 notes give the one-sided Laplace definition and its
      convergence condition. Use these after the coefficient derivation
      is secure.],
    ask: [Which part of an exponential controls magnitude, and which
      part controls rotation?],
    check: [Keep convergence conditions when substituting an imaginary
      Laplace parameter.],
    transition: [The final page documents the learning-design sources.],
    refs: ("O24", "FT09", "LP08")),

  refs_history: note("References: the historical order", 0,
    goal: [Distinguish a classroom reconstruction from chronology.],
    say: [Fourier's original heat treatise is dated 1822. The 1837 joint
      paper of Sturm and Liouville concerns generalized function series
      built from parameter-dependent differential equations. These
      sources support the limited comparison on the history slide.
      They are optional readings, not prerequisites for the coefficient
      calculation.],
    ask: [How can a later theorem help us understand an earlier discovery?],
    check: [We teach SL first because the class knows eigenvalue BVPs.
      We do not claim Fourier followed that order.],
    transition: [The final page documents the teaching-design sources.],
    refs: ("H1822", "HIST37")),

  teaching_refs: note("References for teaching and implementation", 0,
    goal: [Document the evidence behind the teaching choices.],
    say: [The design asks students to predict before seeing an outcome,
      compare cases, and retrieve a worked mechanism with less help.
      Freeman and colleagues support active learning across STEM;
      Crouch and colleagues study prediction in demonstrations;
      Schwartz and Bransford motivate carefully prepared contrasting
      cases. These studies support general design choices, not a claim
      that this exact sequence or timing has been experimentally tested.
      All diagrams are original mathematical plots, regenerated by one
      notebook. SCL branding and the native equation helper are retained
      from the user's template, with their licenses.],
    ask: [After teaching, record the point where students needed another
      example and adjust the timing there.],
    check: [Every equation state should change one idea while preserving
      its relation position. Build checks report any layout drift.],
    transition: [End of materials.],
    refs: ("F14", "C04", "SB98")),
)
