using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using CentTable.Models;

namespace CentTable.Data
{
    public class AppDbContext : IdentityDbContext<ApplicationUser>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<DataGrid> DataGrids { get; set; }
        public DbSet<Column> Columns { get; set; }
        public DbSet<Row> Rows { get; set; }
        public DbSet<Cell> Cells { get; set; }
        public DbSet<DataGridPermission> DataGridPermissions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<DataGrid>()
                .HasMany(dg => dg.Columns)
                .WithOne(c => c.DataGrid)
                .HasForeignKey(c => c.DataGridId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DataGrid>()
                .HasMany(dg => dg.Rows)
                .WithOne(r => r.DataGrid)
                .HasForeignKey(r => r.DataGridId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Row>()
                .HasMany(r => r.Cells)
                .WithOne(c => c.Row)
                .HasForeignKey(c => c.RowId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Column>()
                .HasMany(c => c.Cells)
                .WithOne(cell => cell.Column)
                .HasForeignKey(cell => cell.ColumnId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DataGridPermission>()
                .HasOne(p => p.DataGrid)
                .WithMany(dg => dg.Permissions)
                .HasForeignKey(p => p.DataGridId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DataGridPermission>()
                .HasOne(p => p.User)
                .WithMany()
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}