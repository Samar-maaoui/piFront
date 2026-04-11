import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserServiceService {

  private apiUrl = 'http://localhost:8081/users'

  constructor(private http: HttpClient) { }
    getAllUsers(): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/getAllUsers`);
    }

    getUserById(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/getUserById/${id}`);
    }

    updateUser(id: number, data: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/updateUser/${id}`, data);
    }

    deleteUser(id: number): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/deleteUser/${id}`);
    }

  }
