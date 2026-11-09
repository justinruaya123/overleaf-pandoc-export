# Mathematical and pedagogical review

The displayed equations and their intermediate states were reviewed
against the source conventions and by direct calculation. The notebook
checks independent numerical consequences. The following are the main
checks; convergence theorems are cited, not claimed to follow from the
finite algebra alone.

## Derivations

| Topic | Check |
|---|---|
| Periodic domain | Both values and derivatives match at −L and L. Full period 2L gives ω₀ = π/L. |
| Eigenvalue sign | Integration by parts gives λ∫y² = ∫(y′)² ≥ 0 for a nonzero real eigenfunction; the periodic boundary term vanishes. |
| One forced mode | Substituting u = D yₙ into u − u″ = A yₙ gives D = A/(1 + λₙ). Matching coefficients is legitimate because yₙ is not the zero function. |
| Euler formula | The complex exponential series is absolutely convergent. Simplifying powers of i and collecting even/odd terms gives cosine and sine. |
| Periodic frequencies | e^(2ikL) = 1 gives k = nπ/L, n an integer. The derivative condition then also holds for each exponential mode. |
| Multiplicity | Frequencies n and −n have the same eigenvalue. The positive periodic eigenspaces have cosine/sine dimension two. |
| Average and extraction | A nonzero integer mode averages to zero over a full period; the zero mode averages to one. The q = 0 case is handled before dividing by q. Counterrotation changes n to n − m. |
| Finite calculation | Only finite sums are moved through integrals in the extraction proof. Iₘ = Cₘ follows from the Kronecker delta. |
| Projection | The complex inner product is linear in its first slot. The norm squared of an exponential is 2L. The residual has zero inner product with each retained mode. |
| Least squares | For v in the retained span, Pythagoras gives ‖f − v‖² = ‖f − Sₙ‖² + ‖Sₙ − v‖². |
| Real/complex conversion | For real f, C₋ₙ = conjugate(Cₙ), C₀ = a₀, and Cₙ = (aₙ − i bₙ)/2 for n ≥ 1. |
| Polar interpretation | Multiplication by Cₙ = Rₙ e^(iαₙ) sets the radius and the phase at x = 0; multiplication by the mode adds nω₀x to the angle. A zero coefficient needs no phase. |
| Real normalization | The squared norms of 1, cosine, and sine are 2L, L, and L. Therefore a₀ is the mean, while the positive-index real coefficient formulas use 1/L. |
| Tent | For f = 1 − |x|/L, a₀ = 1/2, bₙ = 0, and aₙ = 2[1 − (−1)ⁿ]/(π²n²). Odd cosine coefficients are positive; even ones vanish. |
| BVP solution | Dₙ = Cₙ/[1 + (nπ/L)²]. The denominator is positive, the mean is preserved, and higher frequencies shrink more. |
| Worked forcing | For L = π and f = 2 + 3cos x + 4sin 2x, u = 2 + (3/2)cos x + (4/5)sin 2x. Substitution recovers amplitudes 2, 3, and 4. |
| Weighted expansion | The weight r occurs in both projection integrals. The convergence statement assumes f belongs to the weighted L² space and a complete orthogonal eigenbasis. |
| Logarithmic example | p = x, r = 1/x, t = ln x, n ≥ 1. The weighted squared norm is (ln 2)/2, giving the coefficient multiplier 2/ln 2. |
| Heat preview | With κ > 0, Aₙ′ = −κλₙ Aₙ. A frequency-three mode has nine times the decay rate of frequency one. |
| BVP convergence | For C² periodic f, two integrations by parts give Cₙ = O(n⁻²), Dₙ = O(n⁻⁴). The series for u, u′, and u″ converge absolutely and uniformly. |
| Transform preview | For an integrable compactly supported function periodized inside T, T Cₙ samples its transform at ωₙ = 2πn/T. The spacing Δω = 2π/T supplies the inverse-integral normalization. A limit theorem is still required. |
| Laplace connection | The one-sided kernel splits as e^(−σt)e^(−iωt). Substitution σ = 0 is qualified by convergence; a two-sided identity is not asserted for arbitrary data. |

## What the notebook checked

The executed notebook contains 10 code cells and 10 vector exports. Its
final numerical check cell reports:

| Check | Maximum error |
|---|---:|
| Periodic endpoint values and slopes | 9.80 × 10⁻¹⁶ |
| Tent cosine/sine coefficients against quadrature | 1.07 × 10⁻¹⁶ |
| Finite operator identity uₙ − uₙ″ = fₙ | 9.99 × 10⁻¹⁶ |
| Triangular-pulse Fourier transform against quadrature | 2.22 × 10⁻¹⁶ |
| Scaled coefficients T Cₙ against the transform | 2.22 × 10⁻¹⁶ |

It also checks the mean 1/2, conjugate-vector addition, rotation averages
(0, 1, 0), the simple forced example, and the heat-rate ratio. These
numerical checks support the exact derivations; they do not prove the
infinite-series convergence theorems.

## Teaching sequence checks

- Questions precede answer reveals. The freeze/average diagram is hidden
  until after the prediction prompt.
- The integration formula follows the desired operation: stop a mode,
  then average. Projection explains why the same coefficient is optimal.
- The theorem justifying the infinite limit is distinguished from the
  finite calculation and the pointwise jump rule.
- The tent requires coefficients to be calculated, while the final exit
  problem checks independent transfer to another finite forcing.
- The real constant convention, the period change from L7, and the local
  phase symbol ψ are explicit.
- The 32 core frame timings total 90 minutes. Extensions and references
  have zero allocated core minutes.

The source roles, learning-study limits, and reading links are recorded in
`REFERENCES.md` and `BIBLIOGRAPHY.md`. Layout measurements are in
`validation/layout.md` and `validation/layout.json`.
