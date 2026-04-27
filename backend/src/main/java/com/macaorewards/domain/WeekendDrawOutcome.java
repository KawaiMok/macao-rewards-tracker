package com.macaorewards.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "weekend_draw_outcomes", uniqueConstraints = {
        @UniqueConstraint(name = "uk_session_draw_index", columnNames = {"session_id", "draw_index"})
})
public class WeekendDrawOutcome {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private WeekendDrawSession session;

    /** 1、2、3 */
    @Column(name = "draw_index", nullable = false)
    private int drawIndex;

    /** 10/20/50/100/200 或 null（未填／未中） */
    @Column(name = "prize_mop")
    private Integer prizeMop;

    public Long getId() {
        return id;
    }

    public WeekendDrawSession getSession() {
        return session;
    }

    public void setSession(WeekendDrawSession session) {
        this.session = session;
    }

    public int getDrawIndex() {
        return drawIndex;
    }

    public void setDrawIndex(int drawIndex) {
        this.drawIndex = drawIndex;
    }

    public Integer getPrizeMop() {
        return prizeMop;
    }

    public void setPrizeMop(Integer prizeMop) {
        this.prizeMop = prizeMop;
    }
}
